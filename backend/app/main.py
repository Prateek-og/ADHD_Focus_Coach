from fastapi import FastAPI

app = FastAPI(title="ADHD Focus Coach API")


@app.get("/")
def root():
    return {"message": "ADHD Focus Coach API is running"}