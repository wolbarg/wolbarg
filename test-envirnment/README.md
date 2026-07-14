# AgentOrc v0.2 — OpenAI-only dual-backend demo

Everything cloud-related uses **one OpenAI API key**:

| Feature | OpenAI surface |
| --- | --- |
| Embeddings | `text-embedding-3-small` |
| Compress / chat | `gpt-4.1-mini` |
| Image “OCR” + captions | `gpt-4o-mini` vision |
| Rerank | `gpt-4.1-mini` chat reranker |
| Keyword hybrid | local BM25 (no key) |
| Storage | SQLite + PostgreSQL |

## Your checklist before “run”

1. Edit `test-envirnment/.env`
   - Set real `OPENAI_API_KEY`
   - Set real `DATABASE_URL` (Postgres running)
2. Install peers for PDF + Postgres:
   ```bash
   cd test-envirnment
   npm install
   npm install pg pdf-parse
   ```
3. Upload fixtures (this is the bar for success):
   - `fixtures/sample.pdf`
   - `fixtures/sample.png` (or `.jpg` / `.webp` with readable text)
4. Rebuild SDK once (includes `openaiReranker`):
   ```bash
   cd ../sdk && npm run build && cd ../test-envirnment
   ```
5. Tell me to **run the tests**

## Run

```bash
npm start
```

If **PDF ingest + image vision ingest pass on both SQLite and Postgres**, the stack is working end-to-end.

## Fixtures

Already present: `sample.md`, `sample.txt`  
You provide: `sample.pdf`, `sample.png`
