import requests
import json
import os
from datetime import datetime

BASE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil'

def buscar_concurso(numero=None):
    url = f"{BASE}/{numero}" if numero else BASE
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return r.json()

def main():
    # Carrega existente
    caminho = 'data/resultados.json'
    resultados = []
    if os.path.exists(caminho):
        with open(caminho) as f:
            resultados = json.load(f)
    
    numeros_existentes = {r['numero'] for r in resultados}
    
    # Busca o último
    ultimo = buscar_concurso()
    numero_atual = ultimo['numero']
    
    # Baixa os últimos 100 concursos
    inicio = max(1, numero_atual - 99)
    
    for n in range(inicio, numero_atual + 1):
        if n in numeros_existentes:
            continue
        try:
            dados = buscar_concurso(n)
            resultados.append({
                'numero': dados['numero'],
                'data': dados['dataApuracao'],
                'dezenas': sorted([int(d) for d in dados['listaDezenas']])
            })
            print(f"Baixado concurso {n}")
        except Exception as e:
            print(f"Erro no concurso {n}: {e}")
    
    resultados.sort(key=lambda x: x['numero'])
    
    with open(caminho, 'w') as f:
        json.dump(resultados, f)
    
    print(f"Total: {len(resultados)} concursos salvos")

if __name__ == '__main__':
    main()
