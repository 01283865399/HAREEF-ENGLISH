export interface ChatRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface ChatResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(value: string): void;
}

export interface ChatHistoryMessage {
  role: "user" | "model";
  text: string;
}

export interface ChatValidationResult {
  error?: string;
  message?: string;
  history?: ChatHistoryMessage[];
}

export function validateRequest(body: unknown): ChatValidationResult;
export default function handler(
  req: ChatRequest,
  res: ChatResponse,
): Promise<unknown>;
