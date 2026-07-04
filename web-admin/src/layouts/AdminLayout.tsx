import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ProLayout } from '@ant-design/pro-components';
import { message, Spin } from 'antd';
import {
  AppstoreOutlined,
  BookOutlined,
  ClusterOutlined,
  CrownOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DollarOutlined,
  FileTextOutlined,
  KeyOutlined,
  NotificationOutlined,
  PictureOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  TagOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { menuRoutes } from '../routes';
import { getLoginUser } from '../api/user';

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
  KeyOutlined: <KeyOutlined />,
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
  const [menuOpenKeys, setMenuOpenKeys] = useState<string[]>(getParentMenuKeys);

  useEffect(() => {
    getLoginUser()
      .then((res) => {
        if (res.data.userRole !== 'admin') {
          message.error('无权访问管理后台');
          navigate('/login');
          return;
        }
      })
      .catch(() => {
        navigate('/login');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

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
      menuFooterRender={false}
      rightContentRender={false}
      actionsRender={false}
      avatarProps={false}
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
    >
      <div style={{ padding: 24, minHeight: 'calc(100vh - 112px)' }}>
        <Outlet />
      </div>
    </ProLayout>
  );
}
