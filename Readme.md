# PozsSCZ

docker exec -it pozosscz_app python manage.py collectstatic --settings=config.prod
docker exec -it pozosscz_app python manage.py makemigrations --settings=config.prod
docker exec -it pozosscz_app python manage.py migrate --settings=config.prod

python manage.py dumpdata clientes --indent 2 > cliente.json
python manage.py dumpdata main --indent 2 > main.json
python manage.py dumpdata pozosscz --indent 2 > pozosscz.json
docker exec pozosscz_app python manage.py loaddata cliente.json
docker exec pozosscz_app python manage.py loaddata main.json
docker exec pozosscz_app python manage.py loaddata pozosscz.json