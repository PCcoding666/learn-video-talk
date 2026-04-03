/**
 * 后端 API 服务配置
 * 提供与 FastAPI 后端的通信接口
 */

// API 基础配置
// 开发环境使用 /api 前缀触发 Vite 代理
const API_BASE_URL = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');

// API 客户端类
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // 从 localStorage 获取 token
    this.token = localStorage.getItem('access_token');
  }

  /**
   * 设置认证 token
   */
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('access_token', token);
  }

  /**
   * 清除认证 token
   */
  clearToken() {
    this.token = null;
    localStorage.removeItem('access_token');
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // 添加认证 token
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API 请求失败:', error);
      throw error;
    }
  }

  /**
   * GET 请求
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST 请求
   */
  async post<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST 表单数据
   */
  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API 请求失败:', error);
      throw error;
    }
  }
}

// 创建 API 客户端实例
export const apiClient = new ApiClient(API_BASE_URL);

// API 端点定义
export const API_ENDPOINTS = {
  // 健康检查
  HEALTH: '/health',
  
  // 认证相关
  AUTH: {
    SIGNUP: '/auth/signup',
    SIGNIN: '/auth/signin',
    GOOGLE_LOGIN: '/auth/google/login',
    GOOGLE_CALLBACK: '/auth/google/callback',
    QUOTA: '/auth/quota',
  },
  
  // 视频处理
  VIDEO: {
    PROCESS: '/video/process',
    STATUS: '/video/status',
    HISTORY: '/video/history',
    DETAILS: '/video/details',
    // 原子化 API
    DOWNLOAD: '/video',       // + /{video_id}/download
    TRANSCRIBE: '/video',     // + /{video_id}/transcribe
    KEYFRAMES: '/video',      // + /{video_id}/keyframes
    SUMMARIZE: '/video',      // + /{video_id}/summarize
    MODULE_STATUS: '/video',  // + /{video_id}/module-status
  },
  
  // 分析结果
  ANALYSIS: {
    GET: '/analysis',
    CHAT_START: '/analysis/chat/start',
    CHAT_MESSAGE: '/analysis/chat/message',
    CHAT_SESSION: '/analysis/chat/session',
  },
  
  // 埋点追踪
  TELEMETRY: {
    MODULE_CLICK: '/telemetry/module-click',
  },
} as const;

// 类型定义
export interface HealthCheckResponse {
  status: string;
}

export interface ServiceStatusResponse {
  status: string;
  services: Record<string, boolean>;
}

export interface SignUpRequest {
  email: string;
  password: string;
  username?: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username?: string;
    subscription_tier?: string;
  };
  access_token: string;
  refresh_token: string;
}

export interface QuotaResponse {
  monthly_video_limit: number;
  monthly_videos_used: number;
  total_storage_mb: number;
  used_storage_mb: number;
  videos_remaining: number;
  storage_remaining_mb: number;
}

export interface ProcessVideoRequest {
  youtube_url?: string;
  video_file?: File;
  mode?: 'full' | 'ingest';
}

// Response from POST /video/process with mode="ingest"
export interface IngestVideoResponse {
  status: string;
  video_id: string;
  title?: string;
  duration?: number;
  oss_video_url?: string;
  thumbnail_url?: string;      // 新增：YouTube 缩略图 URL
  downloaded?: boolean;         // 新增：是否已下载到 OSS
  source_type?: 'youtube' | 'upload';  // 新增：来源类型
  original_url?: string;        // 新增：YouTube 原始 URL
  video_metadata?: VideoSourceMetadata;
  message?: string;
  error?: string;
}

// Metadata returned inline during ingest (varies by source)
export interface VideoSourceMetadata {
  title?: string;
  duration?: number;
  thumbnail?: string;
  description?: string;
  uploader?: string;
  view_count?: number;
  size?: number;
  format_name?: string;
  width?: number;
  height?: number;
  fps?: number;
  codec?: string;
}

// Transcript segment from Supabase compiled metadata
export interface TranscriptSegment {
  text: string;
  start_time: number;
  end_time: number;
  confidence: number;
}

// Transcript block within compiled metadata
export interface TranscriptMetadata {
  oss_audio_url?: string;
  language?: string;
  overall_confidence?: number;
  segments?: TranscriptSegment[];
}

// Keyframe from Supabase compiled metadata
export interface BackendKeyframe {
  frame_id: number;
  timestamp: number;
  oss_image_url: string;
  scene_description?: string;
}

// Video info within compiled metadata
export interface VideoMetaInfo {
  title?: string;
  duration?: number;
  oss_video_url?: string;
  original_url?: string;
  source_type?: string;
}

// Summaries by granularity
export interface VideoSummaries {
  brief?: string;
  standard?: string;
  detailed?: string;
}

// Full compiled metadata from GET /video/details
export interface CompiledMetadata {
  transcript?: TranscriptMetadata;
  keyframes?: BackendKeyframe[];
  video?: VideoMetaInfo;
  summaries?: VideoSummaries;
  title?: string;
  duration?: number;
}

// Response from GET /video/details/{video_id}
export interface VideoDetailsResponse {
  status: string;
  video_id: string;
  metadata?: CompiledMetadata;
  video_summary?: VideoSummaries;
  summary_generated?: boolean;
}

// Chat API 类型定义
export interface ChatStartRequest {
  video_id: string;
  metadata?: Record<string, unknown>;
}

export interface ChatStartResponse {
  status: string;
  session_id: string;
  video_id: string;
  keyframes_count: number;
  transcript_segments_count: number;
}

export interface ChatMessageRequest {
  session_id: string;
  question: string;
  keyframe_ids?: number[];
  top_k?: number;
  auto_keyframes?: boolean;
}

// Keyframe reference returned in chat message response
export interface KeyframeReference {
  frame_id: number;
  timestamp: number;
  oss_image_url?: string;
}

// SSE event types from the ReAct Agent
export interface SSESessionInfoEvent {
  type: 'session_info';
  session_id: string;
  video_title: string;
}

export interface SSEToolCallEvent {
  type: 'tool_call';
  tool: string;
  status: 'running' | 'done';
  round: number;
  preview?: string;
}

export interface SSEAnswerChunkEvent {
  type: 'answer_chunk';
  content: string;
}

export interface SSEReferencesEvent {
  type: 'references';
  time_ranges?: Array<{
    start_time: number;
    end_time: number;
    text: string;
  }>;
  keyframe_ids?: number[];
  keyframes?: KeyframeReference[];
}

export interface SSEDoneEvent {
  type: 'done';
  history_length: number;
}

export interface SSEErrorEvent {
  type: 'error';
  error: string;
}

export type SSEChatEvent =
  | SSESessionInfoEvent
  | SSEToolCallEvent
  | SSEAnswerChunkEvent
  | SSEReferencesEvent
  | SSEDoneEvent
  | SSEErrorEvent;

// Legacy non-streaming response type (kept for backwards compat)
export interface ChatMessageResponse {
  status: string;
  session_id: string;
  answer: string;
  references?: {
    time_ranges?: Array<{
      start_time: number;
      end_time: number;
      text: string;
    }>;
    keyframe_ids?: number[];
    keyframes?: KeyframeReference[];
  };
  history_length: number;
}

// 视频历史记录类型
export interface VideoHistoryItem {
  id: string;
  title: string;
  duration?: number;
  created_at: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  source_type: 'upload' | 'youtube';
  thumbnail_url?: string;
}

export interface VideoHistoryResponse {
  status: string;
  videos: VideoHistoryItem[];
  total: number;
  message?: string;
}

// 埋点相关类型
export interface ModuleClickEvent {
  video_id: string;
  module_id: 'download' | 'transcript' | 'keyframes' | 'summary';
}

export interface TelemetryResponse {
  status: string;
  message: string;
}

// 原子化 API 类型
export interface AtomicTaskResponse {
  status: string;
  video_id: string;
  message?: string;
  error?: string;
  prerequisite?: string;
  // transcribe 响应
  segments_count?: number;
  language?: string;
  confidence?: number;
  segments?: Array<{
    text: string;
    start_time: number;
    end_time: number;
    confidence: number;
  }>;
  // keyframes 响应
  keyframes_count?: number;
  keyframes?: Array<{
    frame_id: number;
    timestamp: number;
    oss_image_url: string;
  }>;
  // summarize 响应
  brief_summary?: string;
  standard_summary?: string;
  detailed_summary?: string;
}

export interface ModuleStatusResponse {
  status: string;
  video_id: string;
  modules: {
    ingest: { status: string; oss_video_url?: string };
    transcript: { status: string };
    keyframes: { status: string };
    summary: { status: string; prerequisite_met: boolean };
  };
}

// API 服务方法
export const apiService = {
  // 健康检查
  async healthCheck(): Promise<HealthCheckResponse> {
    return apiClient.get<HealthCheckResponse>(API_ENDPOINTS.HEALTH);
  },

  // 服务状态
  async getServiceStatus(): Promise<ServiceStatusResponse> {
    return apiClient.get<ServiceStatusResponse>(API_ENDPOINTS.VIDEO.STATUS);
  },

  // 用户注册
  async signUp(data: SignUpRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.SIGNUP, data);
  },

  // 用户登录
  async signIn(data: SignInRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.SIGNIN, data);
    // 保存 token
    apiClient.setToken(response.access_token);
    return response;
  },

  // 获取用户配额
  async getQuota(): Promise<QuotaResponse> {
    return apiClient.get<QuotaResponse>(API_ENDPOINTS.AUTH.QUOTA);
  },

  // 处理视频
  async processVideo(data: ProcessVideoRequest): Promise<IngestVideoResponse> {
    const formData = new FormData();
    
    if (data.youtube_url) {
      formData.append('youtube_url', data.youtube_url);
    }
    
    if (data.video_file) {
      formData.append('video_file', data.video_file);
    }

    if (data.mode) {
      formData.append('mode', data.mode);
    }
    
    return apiClient.postFormData<IngestVideoResponse>(
      API_ENDPOINTS.VIDEO.PROCESS,
      formData
    );
  },

  // 退出登录
  logout() {
    apiClient.clearToken();
  },

  // 启动聊天会话
  async startChatSession(data: ChatStartRequest): Promise<ChatStartResponse> {
    return apiClient.post<ChatStartResponse>(
      API_ENDPOINTS.ANALYSIS.CHAT_START,
      data
    );
  },

  // Send chat message via SSE (ReAct Agent)
  async sendChatMessageSSE(
    data: ChatMessageRequest,
    onEvent: (event: SSEChatEvent) => void,
  ): Promise<void> {
    const url = `${API_BASE_URL}${API_ENDPOINTS.ANALYSIS.CHAT_MESSAGE}`;
    const token = localStorage.getItem('access_token');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      // Keep the last incomplete chunk in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(trimmed.slice(6)) as SSEChatEvent;
          onEvent(event);
        } catch {
          console.warn('Failed to parse SSE event:', trimmed);
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim().startsWith('data: ')) {
      try {
        const event = JSON.parse(buffer.trim().slice(6)) as SSEChatEvent;
        onEvent(event);
      } catch {
        // ignore
      }
    }
  },

  // Legacy: send chat message (non-streaming fallback)
  async sendChatMessage(data: ChatMessageRequest): Promise<ChatMessageResponse> {
    return apiClient.post<ChatMessageResponse>(
      API_ENDPOINTS.ANALYSIS.CHAT_MESSAGE,
      data
    );
  },

  // 获取视频历史记录
  async getVideoHistory(limit: number = 20): Promise<VideoHistoryResponse> {
    return apiClient.get<VideoHistoryResponse>(
      `${API_ENDPOINTS.VIDEO.HISTORY}?limit=${limit}`
    );
  },

  // 获取视频详情
  async getVideoDetails(video_id: string): Promise<VideoDetailsResponse> {
    return apiClient.get<VideoDetailsResponse>(
      `${API_ENDPOINTS.VIDEO.DETAILS}/${video_id}`
    );
  },

  // 埋点：模块点击事件（用于画板门测试）
  async trackModuleClick(video_id: string, module_id: ModuleClickEvent['module_id']): Promise<TelemetryResponse> {
    return apiClient.post<TelemetryResponse>(
      API_ENDPOINTS.TELEMETRY.MODULE_CLICK,
      { video_id, module_id }
    );
  },

  // ========================================================================
  // 原子化 API - 用于百宝箱模式
  // ========================================================================

  // 原子化下载（YouTube 视频延迟下载）
  async downloadVideo(video_id: string): Promise<AtomicTaskResponse> {
    return apiClient.post<AtomicTaskResponse>(
      `${API_ENDPOINTS.VIDEO.DOWNLOAD}/${video_id}/download`
    );
  },

  // 原子化转录
  async transcribeVideo(video_id: string): Promise<AtomicTaskResponse> {
    return apiClient.post<AtomicTaskResponse>(
      `${API_ENDPOINTS.VIDEO.TRANSCRIBE}/${video_id}/transcribe`
    );
  },

  // 原子化关键帧提取
  async extractKeyframes(video_id: string): Promise<AtomicTaskResponse> {
    return apiClient.post<AtomicTaskResponse>(
      `${API_ENDPOINTS.VIDEO.KEYFRAMES}/${video_id}/keyframes`
    );
  },

  // 原子化总结生成
  async summarizeVideo(video_id: string): Promise<AtomicTaskResponse> {
    return apiClient.post<AtomicTaskResponse>(
      `${API_ENDPOINTS.VIDEO.SUMMARIZE}/${video_id}/summarize`
    );
  },

  // 获取模块状态
  async getModuleStatus(video_id: string): Promise<ModuleStatusResponse> {
    return apiClient.get<ModuleStatusResponse>(
      `${API_ENDPOINTS.VIDEO.MODULE_STATUS}/${video_id}/module-status`
    );
  },
};
