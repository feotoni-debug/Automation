# Backend de análise (Python / FastAPI)

Pipeline em 3 etapas, cada uma isolada em um adaptador (`app/adapters/`):

| Etapa | Repositório | Adaptador | Estado |
|---|---|---|---|
| 1. Alinhar páginas | [DIRD](https://github.com/hanquansanren/DIRD) | `alinhamento.py` | Repositório tem apenas README (código não liberado). Usa OpenCV (ORB + homografia). |
| 2. Localizar carimbos/assinaturas | [Stamp-Signature-Segregate](https://github.com/KumarShivam1908/Stamp-Signature-Segregate) | `segregacao.py` | **Ativo!** Integrado em `vendor/Stamp-Signature-Segregate` usando os pesos treinados `webapp/model_weights/best.pt` (YOLOv12) combinados com OpenCV. |
| 3. Indício de adulteração de texto | [DocTamper](https://github.com/qcf-568/DocTamper) | `adulteracao.py` | Código em `vendor/DocTamper-main`. Requer download dos pesos (`dtd.pth`) e GPU para ativação. |

## Rodar (Python 3.12)

```powershell
cd backend
.\.venv\Scripts\python.exe teste_pipeline.py          # teste rápido do pipeline
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000  # API
```

`GET /api/saude` mostra quais componentes estão ativos.

> Resultado destinado à conferência humana; não representa validação de autenticidade.
