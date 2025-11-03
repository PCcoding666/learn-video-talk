import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';

const Login = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // 如果已登录，重定向到应用主页
    if (user) {
      navigate('/app');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            YouTube 视频分析
          </h1>
          <p className="text-muted-foreground">登录以访问您的视频历史和高级功能</p>
        </div>

        <Card className="p-6 shadow-xl">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary))',
                  },
                },
              },
              className: {
                container: 'w-full',
                button: 'w-full rounded-lg font-medium transition-all',
                input: 'rounded-lg',
              },
            }}
            providers={['google']}
            redirectTo={`${window.location.origin}/app`}
            localization={{
              variables: {
                sign_in: {
                  email_label: '邮箱',
                  password_label: '密码',
                  email_input_placeholder: '请输入您的邮箱',
                  password_input_placeholder: '请输入密码',
                  button_label: '登录',
                  loading_button_label: '登录中...',
                  social_provider_text: '使用 {{provider}} 登录',
                  link_text: '已有账号？登录',
                },
                sign_up: {
                  email_label: '邮箱',
                  password_label: '密码',
                  email_input_placeholder: '请输入您的邮箱',
                  password_input_placeholder: '请输入密码（至少6位）',
                  button_label: '注册',
                  loading_button_label: '注册中...',
                  social_provider_text: '使用 {{provider}} 注册',
                  link_text: '还没有账号？注册',
                },
                forgotten_password: {
                  link_text: '忘记密码？',
                  email_label: '邮箱',
                  password_label: '密码',
                  email_input_placeholder: '请输入您的邮箱',
                  button_label: '发送重置密码邮件',
                  loading_button_label: '发送中...',
                },
              },
            }}
          />
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          登录即表示您同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
};

export default Login;
