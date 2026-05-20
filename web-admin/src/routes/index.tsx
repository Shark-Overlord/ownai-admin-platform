import { Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import UserManage from '../pages/UserManage';
import ArtworkManage from '../pages/ArtworkManage';
import ArtworkPreview from '../pages/ArtworkPreview';
import CategoryManage from '../pages/CategoryManage';
import CategoryTagTree from '../pages/CategoryTagTree';
import TagManage from '../pages/TagManage';
import OrderManage from '../pages/OrderManage';
import MemberOrderManage from '../pages/MemberOrderManage';
import PointManage from '../pages/PointManage';
import MemberPriceConfigManage from '../pages/MemberPriceConfigManage';
import OperationLog from '../pages/OperationLog';

export const routes = [
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <AdminLayout />,
    meta: { requiresAdmin: true },
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'user',
        element: <UserManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'artwork',
        element: <ArtworkManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'category',
        element: <CategoryManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'category-tag-tree',
        element: <CategoryTagTree />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'tag',
        element: <TagManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'order',
        element: <OrderManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'member-order',
        element: <MemberOrderManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'point',
        element: <PointManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'member-price-config',
        element: <MemberPriceConfigManage />,
        meta: { requiresAdmin: true },
      },
      {
        path: 'operation-log',
        element: <OperationLog />,
        meta: { requiresAdmin: true },
      },
    ],
  },
  {
    path: '/artwork/view/:id',
    element: <ArtworkPreview />,
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
];

// 菜单配置（用于 ProLayout）
export const menuRoutes = [
  {
    path: '/dashboard',
    name: '概况',
    icon: 'DashboardOutlined',
  },
  {
    path: '/user',
    name: '用户管理',
    icon: 'UserOutlined',
  },
  {
    path: '/artwork',
    name: '作品管理',
    icon: 'PictureOutlined',
  },
  {
    path: '/category',
    name: '分类管理',
    icon: 'AppstoreOutlined',
  },
  {
    path: '/category-tag-tree',
    name: '分类标签树',
    icon: 'ClusterOutlined',
  },
  {
    path: '/tag',
    name: '标签管理',
    icon: 'TagOutlined',
  },
  {
    path: '/order',
    name: '作品订单',
    icon: 'ShoppingCartOutlined',
  },
  {
    path: '/member-order',
    name: '会员订单',
    icon: 'CrownOutlined',
  },
  {
    path: '/point',
    name: '积分中心',
    icon: 'DollarOutlined',
  },
  {
    path: '/member-price-config',
    name: '会员价格配置',
    icon: 'SettingOutlined',
  },
  {
    path: '/operation-log',
    name: '操作日志',
    icon: 'FileTextOutlined',
  },
];
