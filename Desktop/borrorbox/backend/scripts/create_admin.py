"""Create (or promote) an admin account for the BorrowBox backend.

Usage:
    python scripts/create_admin.py --email admin@university.edu --password "S3curePass!" \
        --name "Campus Admin" --college "State University"

Admin privileges can never be granted through public registration or the frontend;
this script is the only supported way to bootstrap an administrator.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models import User  # noqa: E402
from app.security import hash_password  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a BorrowBox admin account")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", default="Campus Admin")
    parser.add_argument("--college", default="")
    parser.add_argument("--department", default="Administration")
    parser.add_argument("--year-of-study", default="Staff")
    args = parser.parse_args()

    if len(args.password) < 8:
        parser.error("Password must be at least 8 characters long.")

    Base.metadata.create_all(bind=engine)
    email = args.email.lower().strip()

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user:
            user.is_admin = True
            user.password_hash = hash_password(args.password)
            db.add(user)
            db.commit()
            print(f"Existing user {email} promoted to admin.")
        else:
            user = User(
                name=args.name.strip(),
                email=email,
                password_hash=hash_password(args.password),
                college=args.college.strip(),
                department=args.department.strip(),
                year_of_study=args.year_of_study.strip(),
                is_verified=True,
                is_admin=True,
            )
            db.add(user)
            db.commit()
            print(f"Admin account created for {email}.")


if __name__ == "__main__":
    main()
