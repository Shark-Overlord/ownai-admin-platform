import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ProLayout } from '@ant-design/pro-components';
import { Dropdown, message, Space, Spin } from 'antd';
import {
  AppstoreOutlined,
  BookOutlined,
  ClusterOutlined,
  CrownOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DollarOutlined,
  DownOutlined,
  FileTextOutlined,
  LogoutOutlined,
  NotificationOutlined,
  PictureOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  TagOutlined,
  UserOutlined,
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
  NotificationOutlined: <NotificationOutlined />,
  BookOutlined: <BookOutlined />,
};

type MenuRoute = {
  path: string;
  name: string;
  icon?: string;
  routes?: MenuRoute[];
};

function mapMenuRoute(item: MenuRoute): any {
  const hasChildren = Boolean(item.routes?.length);
  return {
    key: hasChildren ? `menu:${item.path}` : item.path,
    path: item.path,
    name: item.name,
    icon: item.icon ? iconMap[item.icon] : undefined,
    routes: item.routes?.map(mapMenuRoute),
  };
}

function getParentMenuKeys() {
  return menuRoutes.filter((item) => item.routes?.length).map((item) => `menu:${item.path}`);
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<LoginUserVO | null>(null);
  const [menuOpenKeys, setMenuOpenKeys] = useState<string[]>(getParentMenuKeys);

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

  return (
    <ProLayout
      title="后台管理"
      logo={null}
      layout="side"
      fixSiderbar
      fixedHeader
      openKeys={menuOpenKeys}
      menu={{ autoClose: false }}
      onOpenChange={(keys) => {
        setMenuOpenKeys(Array.isArray(keys) ? keys : []);
      }}
      route={{ path: '/', routes: menuRoutes.map(mapMenuRoute) }}
      location={{ pathname: location.pathname }}
      menuItemRender={(item: any, dom: any) => {
        if (item.routes?.length) {
          return dom;
        }
        return (
          <a
            onClick={() => {
              navigate(item.path || item.key);
            }}
          >
            {dom}
          </a>
        );
      }}
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
