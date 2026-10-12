from conftest import auth_header, make_item, register_user


class TestMarketplaceListing:
    def test_empty_marketplace_returns_empty_list(self, client):
        response = client.get("/api/v1/items")
        assert response.status_code == 200
        assert response.json() == []

    def test_pagination_limit_and_offset(self, client):
        _, token = register_user(client, "pager@university.edu")
        for i in range(5):
            make_item(client, token, title=f"Paged Item {i}")

        first = client.get("/api/v1/items?limit=2&offset=0").json()
        second = client.get("/api/v1/items?limit=2&offset=2").json()
        third = client.get("/api/v1/items?limit=2&offset=4").json()

        assert len(first) == 2
        assert len(second) == 2
        assert len(third) == 1

        seen = [item["id"] for item in first + second + third]
        assert len(set(seen)) == 5

    def test_offset_beyond_total_returns_empty(self, client):
        _, token = register_user(client, "pager2@university.edu")
        make_item(client, token)
        assert client.get("/api/v1/items?limit=10&offset=50").json() == []

    def test_invalid_pagination_is_rejected(self, client):
        assert client.get("/api/v1/items?limit=1000").status_code == 422
        assert client.get("/api/v1/items?offset=-1").status_code == 422

    def test_price_range_filters(self, client):
        _, token = register_user(client, "pricer@university.edu")
        make_item(client, token, title="Free Textbook", lendingMode="free", dailyPrice=0)
        make_item(
            client,
            token,
            title="Cheap Rental",
            lendingMode="rent",
            dailyPrice=5,
            category="creative",
        )
        make_item(
            client,
            token,
            title="Premium Rental",
            lendingMode="rent",
            dailyPrice=40,
            category="creative",
        )

        cheap = client.get("/api/v1/items?max_price=5").json()
        assert {item["title"] for item in cheap} == {"Free Textbook", "Cheap Rental"}

        premium = client.get("/api/v1/items?min_price=10").json()
        assert {item["title"] for item in premium} == {"Premium Rental"}

        band = client.get("/api/v1/items?min_price=1&max_price=10").json()
        assert {item["title"] for item in band} == {"Cheap Rental"}

    def test_invalid_price_filter_rejected(self, client):
        assert client.get("/api/v1/items?min_price=-5").status_code == 422

    def test_sort_by_price(self, client):
        _, token = register_user(client, "sorter@university.edu")
        make_item(
            client, token, title="Thirty", lendingMode="rent", dailyPrice=30, category="creative"
        )
        make_item(
            client, token, title="Ten", lendingMode="rent", dailyPrice=10, category="creative"
        )

        asc = client.get("/api/v1/items?lending_mode=rent&sort_by=price_asc").json()
        desc = client.get("/api/v1/items?lending_mode=rent&sort_by=price_desc").json()
        assert [item["dailyPrice"] for item in asc] == [10, 30]
        assert [item["dailyPrice"] for item in desc] == [30, 10]

    def test_unknown_sort_falls_back_safely(self, client):
        _, token = register_user(client, "sorter2@university.edu")
        make_item(client, token, title="Anything")
        response = client.get("/api/v1/items?sort_by=not_a_real_sort")
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_get_missing_item_returns_404(self, client):
        assert client.get("/api/v1/items/does-not-exist").status_code == 404

    def test_owner_id_in_payload_is_ignored_on_create(self, client):
        victim, _ = register_user(client, "victim@university.edu")
        attacker, attacker_token = register_user(client, "attacker@university.edu")

        response = client.post(
            "/api/v1/items",
            json={
                "title": "Spoofed Owner Listing",
                "description": "Trying to assign a different owner.",
                "category": "sports",
                "condition": "good",
                "lendingMode": "free",
                "dailyPrice": 0,
                "deposit": 0,
                "pickupLocation": "Gym",
                "images": [],
                "isAvailable": True,
                "minBorrowDays": 1,
                "maxBorrowDays": 7,
                "ownerId": victim["id"],
            },
            headers=auth_header(attacker_token),
        )
        assert response.status_code == 201, response.text
        assert response.json()["ownerId"] == attacker["id"]


class TestMyListings:
    def test_my_listings_requires_auth(self, client):
        assert client.get("/api/v1/items/mine").status_code == 401

    def test_my_listings_returns_only_signed_in_user_items(self, client):
        owner, owner_token = register_user(client, "mine-owner@university.edu")
        _, other_token = register_user(client, "mine-other@university.edu")
        make_item(client, owner_token, title="My Own Item")
        make_item(client, other_token, title="Someone Else Item")

        mine = client.get("/api/v1/items/mine", headers=auth_header(owner_token)).json()
        assert len(mine) == 1
        assert mine[0]["title"] == "My Own Item"
        assert mine[0]["ownerId"] == owner["id"]

    def test_mine_path_is_not_treated_as_an_item_id(self, client):
        _, token = register_user(client, "mine-route@university.edu")
        response = client.get("/api/v1/items/mine", headers=auth_header(token))
        assert response.status_code == 200
        assert response.json() == []
