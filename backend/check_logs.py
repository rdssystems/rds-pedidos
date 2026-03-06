import os
import glob

# Procurar logs recentes ou no docker-compose local
# O docker-compose logs do docker fica complexo de pegar os metadados. Mas eu posso pedir pro docker rodar um comando puro no host (que já fiz, deu erro).
# Vamos ler o log puro do backend interceptando os prints!
