# Dockerizing Django with Postgres, Gunicorn, and Redis

## Want to use this project?

### Development

Uses the default Django development server.

1. Install requierements.dev.txt
2. Run Django, has browser reload is  

    ```sh
    pip install -r requirements.dev.txt
    python manage.py runserver
    ```

    Test it out at [http://localhost:8000](http://localhost:8000).

### Production

Uses gunicorn + Redis.

1. Rename an edit *.env.sample* to *.env*. Update the environment variables.
2. Build the images and run the containers:

    ```sh
    docker-compose up -d --build
    ```

    Test it out at [http://localhost:8003](http://localhost:8003). No staticfiles.
