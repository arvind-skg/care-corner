# --------------------------------------------------------------
# backend/migrate_passwords.py
# --------------------------------------------------------------
import psycopg2
import os
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# --- Database Configuration (for local execution) ---
# IMPORTANT: Replace 'your_local_password' with your actual PostgreSQL password
DB_HOST = 'localhost'
DB_NAME = 'care_corner'
DB_USER = 'postgres'
DB_PASSWORD = 'arvind28' # <--- CHANGE THIS FOR LOCAL EXECUTION

def get_db_connection_local():
    """Returns a psycopg2 connection using local credentials."""
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def migrate_passwords_to_argon2():
    """
    Finds plaintext passwords in the 'users' table and replaces them with Argon2 hashes.
    This script is designed to be run only ONCE locally.
    """
    ph = PasswordHasher()
    conn = None
    updated_count = 0

    try:
        conn = get_db_connection_local()
        cur = conn.cursor()

        # Ensure the password column can hold the hash
        print("Ensuring password column is VARCHAR(255) for hash storage...")
        cur.execute("ALTER TABLE users ALTER COLUMN password TYPE VARCHAR(255);")
        conn.commit()
        print("Password column size verified/updated.")

        # Select users whose password does NOT look like an Argon2 hash
        # (Argon2 hashes start with '$argon2id$')
        print("Fetching users with potentially plaintext passwords for migration...")
        cur.execute("SELECT id, password FROM users WHERE password IS NOT NULL AND NOT (password LIKE '$argon2id$%' OR password LIKE '$pbkdf2$%')")
        users_to_update = cur.fetchall()

        if not users_to_update:
            print("No plaintext passwords found to migrate. All users seem to be up-to-date or already hashed.")
            return

        print(f"Found {len(users_to_update)} user(s) to migrate.")

        for user_id, plain_password in users_to_update:
            if not plain_password:
                print(f"Skipping user {user_id} with empty password.")
                continue
            
            try:
                # Hash the plaintext password
                hashed_password = ph.hash(plain_password)
                
                # Update the database with the new hash
                cur.execute("UPDATE users SET password = %s WHERE id = %s", (hashed_password, user_id))
                print(f"Successfully migrated password for user ID: {user_id}")
                updated_count += 1
            except Exception as e:
                print(f"Could not migrate password for user ID {user_id}: {e}")

        conn.commit()
        print(f"\nMigration complete. {updated_count} user password(s) have been hashed.")

    except Exception as e:
        print(f"An error occurred during migration: {e}")
        if conn:
            conn.rollback()
    finally:
        if 'cur' in locals() and cur: cur.close()
        if 'conn' in locals() and conn: conn.close()

# --- Run the migration ---
if __name__ == "__main__":
    migrate_passwords_to_argon2()