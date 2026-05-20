import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { message, Tabs } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { login } from '../../api/user';

export default function Login() {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState<'account'>('account');

  const handleSubmit = async (values: any) => {
    try {
      const res = await login(values);
      if (res.data.userRole !== 'admin') {
        message.error('您没有管理员权限');
        return;
      }
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }
      message.success('登录成功');
      navigate('/dashboard');
    } catch (err) {
      // 错误已在拦截器提示
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
      <LoginForm
        logo=""
        title="后台管理系统"
        subTitle="SpringBoot Init Admin"
        onFinish={handleSubmit}
      >
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
              rules={[{ required: true, message: '请输入账号!' }]}
            />
            <ProFormText.Password
              name="userPassword"
              fieldProps={{
                size: 'large',
                prefix: <LockOutlined />,
              }}
              placeholder="请输入密码"
              rules={[{ required: true, message: '请输入密码!' }]}
            />
          </>
        )}
      </LoginForm>
    </div>
  );
}
