import { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Statistic, Row, Col } from 'antd';
import {
  UserOutlined,
  CrownOutlined,
  PictureOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import request from '../../api/request';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, plus: 0, pro: 0 });
  const [artworkTotal, setArtworkTotal] = useState(0);

  useEffect(() => {
    request.get('/user/stats').then((res: any) => {
      if (res.code === 0) {
        setStats(res.data);
      }
    });
    request.get('/artwork/stats').then((res: any) => {
      if (res.code === 0) {
        setArtworkTotal(res.data.total);
      }
    });
  }, []);

  return (
    <PageContainer title="概况">
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="用户总数" value={stats.total} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Plus 会员" value={stats.plus} prefix={<CrownOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Pro 会员" value={stats.pro} prefix={<CrownOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="作品总数" value={artworkTotal} prefix={<PictureOutlined />} />
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="今日订单" value={23} prefix={<ShoppingCartOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="积分发放" value={5600} prefix={<DollarOutlined />} />
          </Card>
        </Col>
      </Row>
      <Card style={{ marginTop: 24 }} title="系统公告">
        <p>1. 后台管理基于 React + Vite + Ant Design Pro 构建</p>
        <p>2. 接口默认前缀：http://localhost:8011/api</p>
        <p>3. 如需修改后端地址，请编辑 .env 文件中的 VITE_API_BASE_URL</p>
      </Card>
    </PageContainer>
  );
}
