# PozsSCZ

python manage.py dumpdata clientes --indent 2 > cliente.json
python manage.py dumpdata main --indent 2 > main.json
python manage.py dumpdata pozosscz --indent 2 > pozosscz.json
docker exec pozosscz_app python manage.py loaddata clientes.json
docker exec pozosscz_app python manage.py loaddata main.json
docker exec pozosscz_app python manage.py loaddata pozosscz.json