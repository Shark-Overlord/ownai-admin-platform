import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { message, Tabs } from 'antd';
import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { getLoginCaptcha, login, type LoginCaptchaVO } from '../../api/user';

function buildCaptchaSrc(captcha?: LoginCaptchaVO) {
  if (!captcha) {
    return '';
  }
  if (captcha.imageUrl) {
    return captcha.imageUrl;
  }
  if (!captcha.imageBase64) {
    return '';
  }
  return captcha.imageBase64.startsWith('data:image')
    ? captcha.imageBase64
    : `data:image/png;base64,${captcha.imageBase64}`;
}

export default function Login() {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState<'account'>('account');
  const [captcha, setCaptcha] = useState<LoginCaptchaVO>();
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const res = await getLoginCaptcha();
      setCaptcha(res.data);
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handleSubmit = async (values: any) => {
    try {
      const res = await login({
        ...values,
        captchaId: captcha?.captchaId,
      });
      if (res.data.userRole !== 'admin') {
        message.error('当前账号没有管理员权限');
        await fetchCaptcha();
        return;
      }
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }
      message.success('登录成功');
      navigate('/dashboard');
    } catch (err) {
      await fetchCaptcha();
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f0f2f5',
      }}
    >
      <LoginForm logo="" title="后台管理系统" subTitle="OwnAI Admin" onFinish={handleSubmit}>
        <Tabs
          centered
          activeKey={loginType}
          onChange={(activeKey) => setLoginType(activeKey as 'account')}
          items={[{ key: 'account', label: '账号密码登录' }]}
        />
        {loginType === 'account' && (
          <>
            <ProFormText
              name="userAccount"
              fieldProps={{
                size: 'large',
                prefix: <UserOutlined />,
              }}
              placeholder="请输入管理员账号"
              rules={[{ required: true, message: '请输入账号' }]}
            />
            <ProFormText.Password
              name="userPassword"
              fieldProps={{
                size: 'large',
                prefix: <LockOutlined />,
              }}
              placeholder="请输入密码"
              rules={[{ required: true, message: '请输入密码' }]}
            />
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <ProFormText
                name="captchaCode"
                fieldProps={{
                  size: 'large',
                  prefix: <SafetyCertificateOutlined />,
                }}
                placeholder="请输入验证码"
                rules={[{ required: true, message: '请输入验证码' }]}
              />
              <button
                type="button"
                onClick={fetchCaptcha}
                disabled={captchaLoading}
                style={{
                  width: 132,
                  height: 40,
                  padding: 0,
                  border: '1px solid #d9d9d9',
                  borderRadius: 6,
                  background: '#fff',
                  cursor: captchaLoading ? 'default' : 'pointer',
                  overflow: 'hidden',
                }}
                title="点击刷新验证码"
              >
                {buildCaptchaSrc(captcha) ? (
                  <img
                    src={buildCaptchaSrc(captcha)}
                    alt="captcha"
                    style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ color: '#999' }}>刷新验证码</span>
                )}
              </button>
            </div>
          </>
        )}
      </LoginForm>
    </div>
  );
}
