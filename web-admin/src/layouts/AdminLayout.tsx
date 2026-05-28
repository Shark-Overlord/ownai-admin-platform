import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ProLayout } from '@ant-design/pro-components';
import { Spin, message, Dropdown, Space } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  PictureOutlined,
  AppstoreOutlined,
  TagOutlined,
  ClusterOutlined,
  ShoppingCartOutlined,
  CrownOutlined,
  DollarOutlined,
  SettingOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  LogoutOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { menuRoutes } from '../routes';
import { getLoginUser, logout, type LoginUserVO } from '../api/user';

const iconMap: Record<string, React.ReactNode> = {
  DashboardOutlined: <DashboardOutlined />,
  UserOutlined: <UserOutlined />,
  PictureOutlined: <PictureOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
  TagOutlined: <TagOutlined />,
  ShoppingCartOutlined: <ShoppingCartOutlined />,
  CrownOutlined: <CrownOutlined />,
  DollarOutlined: <DollarOutlined />,
  SettingOutlined: <SettingOutlined />,
  ClusterOutlined: <ClusterOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  DatabaseOutlined: <DatabaseOutlined />,
};

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<LoginUserVO | null>(null);

  useEffect(() => {
    getLoginUser()
      .then((res) => {
        if (res.data.userRole !== 'admin') {
          message.error('无权访问管理后台');
          navigate('/login');
          return;
        }
        setUser(res.data);
      })
      .catch(() => {
        navigate('/login');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = async () => {
    localStorage.removeItem('token');
    await logout();
    message.success('已退出登录');
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  const menuItems = menuRoutes.map((item) => ({
    key: item.path,
    icon: iconMap[item.icon],
    name: item.name,
    path: item.path,
  }));

  return (
    <ProLayout
      title="后台管理"
      logo={null}
      layout="mix"
      fixSiderbar
      fixedHeader
      route={{ path: '/', routes: menuItems }}
      location={{ pathname: location.pathname }}
      menuItemRender={(item: any, dom: any) => (
        <a
          onClick={() => {
            navigate(item.path || item.key);
          }}
        >
          {dom}
        </a>
      )}
      avatarProps={{
        src: user?.userAvatar,
        size: 'small',
        title: (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: '退出登录',
                  onClick: handleLogout,
                },
              ],
            }}
          >
            <Space>
              {user?.userName || user?.userAccount || 'Admin'}
              <DownOutlined />
            </Space>
          </Dropdown>
        ),
      }}
    >
      <div style={{ padding: 24, minHeight: 'calc(100vh - 112px)' }}>
        <Outlet />
      </div>
    </ProLayout>
  );
}
