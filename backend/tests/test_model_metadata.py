from app.services.model_metadata import infer_model_type


class TestInferModelType:
    def test_llm_default(self):
        assert infer_model_type("gpt-4o") == "llm"
        assert infer_model_type("claude-sonnet-4-20250514") == "llm"
        assert infer_model_type("deepseek-chat") == "llm"
        assert infer_model_type("qwen2.5-72b-instruct") == "llm"

    def test_vlm_detection(self):
        assert infer_model_type("gpt-4o-vision") == "vlm"
        assert infer_model_type("qwen2-vl-72b") == "vlm"
        assert infer_model_type("internvl2-26b") == "vlm"
        assert infer_model_type("llava-v1.6") == "vlm"
        assert infer_model_type("cogvlm2-19b") == "vlm"
        assert infer_model_type("minicpm-v-2_6") == "vlm"

    def test_embedding_detection(self):
        assert infer_model_type("text-embedding-3-small") == "embedding"
        assert infer_model_type("bge-large-zh") == "embedding"
        assert infer_model_type("e5-large-v2") == "embedding"
        assert infer_model_type("bge-m3") == "embedding"

    def test_rerank_detection(self):
        assert infer_model_type("bge-reranker-v2-m3") == "rerank"
        assert infer_model_type("cross-encoder-ms-marco-MiniLM-L-6-v2") == "rerank"
        assert infer_model_type("cohere-rerank-v3") == "rerank"

    def test_case_insensitive(self):
        assert infer_model_type("BGE-Large") == "embedding"
        assert infer_model_type("Rerank-V2") == "rerank"
        assert infer_model_type("Qwen2-VL-72B") == "vlm"
