#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import requests
import json
import sys
import random

BASE_URL = "http://localhost:8011/api"
results = []

admin_cookie = {}
user_cookie = {}
user_id = None
admin_user_id = 1
test_artwork_id = None
test_order_no = None
test_member_order_no = None
test_category_id = None
test_tag_id = None

def add_result(module, method, path, auth_type, precondition, request_body, response, conclusion, fail_reason=""):
    results.append({
        "module": module,
        "method": method,
        "path": path,
        "auth_type": auth_type,
        "precondition": precondition,
        "request_body": request_body,
        "response": json.dumps(response, ensure_ascii=False) if isinstance(response, dict) else str(response),
        "conclusion": conclusion,
        "fail_reason": fail_reason
    })

def call_api(method, url, json_data=None, cookies=None):
    try:
        if method == "GET":
            r = requests.get(url, cookies=cookies, timeout=10)
        else:
            r = requests.post(url, json=json_data, cookies=cookies, timeout=10)
        try:
            return r.json()
        except:
            return {"code": r.status_code, "raw": r.text}
    except Exception as e:
        return {"code": -1, "error": str(e)}

# ==================== User ====================
# 1.1 用户注册（如已存在则视为基线就绪）
req = {"userAccount": "testuser001", "userPassword": "12345678", "checkPassword": "12345678"}
res = call_api("POST", f"{BASE_URL}/user/register", req)
register_success = res.get("code") == 0
add_result("user", "POST", "/user/register", "公开", "无", json.dumps(req, ensure_ascii=False), res, "通过" if register_success or "账号已存在" in str(res.get("message","")) else "失败")

# 1.2 普通用户登录
req = {"userAccount": "testuser001", "userPassword": "12345678"}
s = requests.Session()
r = s.post(f"{BASE_URL}/user/login", json=req)
user_cookie = dict(s.cookies)
res = r.json()
user_id = res.get("data", {}).get("id") if isinstance(res.get("data"), dict) else None
add_result("user", "POST", "/user/login", "公开", "已注册用户 testuser001", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 1.3 管理员登录
s2 = requests.Session()
r2 = s2.post(f"{BASE_URL}/user/login", json={"userAccount": "admin", "userPassword": "12345678"})
admin_cookie = dict(s2.cookies)
res2 = r2.json()
add_result("user", "POST", "/user/login (admin)", "公开", "初始化账号 admin/12345678", '{"userAccount":"admin","userPassword":"12345678"}', res2, "通过" if res2.get("code") == 0 else "失败")

# 1.4 获取当前登录用户 (普通用户)
res = call_api("GET", f"{BASE_URL}/user/get/login", cookies=user_cookie)
add_result("user", "GET", "/user/get/login", "登录用户", "testuser001 已登录", "无", res, "通过" if res.get("code") == 0 else "失败")

# 1.5 用户更新个人信息
req = {"userName": "Test User Updated", "userProfile": "Updated profile"}
res = call_api("POST", f"{BASE_URL}/user/update/my", req, user_cookie)
add_result("user", "POST", "/user/update/my", "登录用户", "testuser001 已登录", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 1.6 获取脱敏用户信息
res = call_api("GET", f"{BASE_URL}/user/get/vo?id={user_id}")
add_result("user", "GET", "/user/get/vo", "公开", f"用户ID {user_id} 存在", f"id={user_id}", res, "通过" if res.get("code") == 0 else "失败")

# 1.7 分页查询脱敏用户列表
req = {"current": 1, "pageSize": 10}
res = call_api("POST", f"{BASE_URL}/user/list/page/vo", req)
add_result("user", "POST", "/user/list/page/vo", "公开", "无", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 1.8 管理员添加用户（使用随机账号避免逻辑删除后唯一索引冲突）
admin_added_account = f"testadminadd_{random.randint(1000,9999)}"
req = {"userAccount": admin_added_account, "userName": "Admin Added User", "userRole": "user", "memberLevel": "normal", "pointBalance": 100}
res = call_api("POST", f"{BASE_URL}/user/add", req, admin_cookie)
added_user_id = res.get("data")
add_result("user", "POST", "/user/add", "管理员", "admin 已登录", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 1.9 管理员根据ID获取用户
res = call_api("GET", f"{BASE_URL}/user/get?id={added_user_id}", cookies=admin_cookie)
add_result("user", "GET", "/user/get", "管理员", f"admin 已登录，用户ID {added_user_id} 存在", f"id={added_user_id}", res, "通过" if res.get("code") == 0 else "失败")

# 1.10 管理员更新用户
req = {"id": added_user_id, "userName": "Updated Admin User", "pointBalance": 200}
res = call_api("POST", f"{BASE_URL}/user/update", req, admin_cookie)
add_result("user", "POST", "/user/update", "管理员", f"admin 已登录，目标用户ID {added_user_id}", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 1.11 管理员分页查询用户
req = {"current": 1, "pageSize": 10}
res = call_api("POST", f"{BASE_URL}/user/list/page", req, admin_cookie)
add_result("user", "POST", "/user/list/page", "管理员", "admin 已登录", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 1.12 用户登出
res = call_api("POST", f"{BASE_URL}/user/logout", cookies=user_cookie)
add_result("user", "POST", "/user/logout", "登录用户", "testuser001 已登录", "无", res, "通过" if res.get("code") == 0 else "失败")

# 1.13 管理员删除用户
req = {"id": added_user_id}
res = call_api("POST", f"{BASE_URL}/user/delete", req, admin_cookie)
add_result("user", "POST", "/user/delete", "管理员", f"admin 已登录，目标用户ID {added_user_id}", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# ==================== Category ====================
# 2.1 管理员添加分类
import random
cat_name = f"TestCategory_{random.randint(1000,9999)}"
req = {"name": cat_name, "description": "Test category desc", "sort": 50}
res = call_api("POST", f"{BASE_URL}/category/add", req, admin_cookie)
test_category_id = res.get("data")
add_result("category", "POST", "/category/add", "管理员", "admin 已登录", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 2.2 获取分类详情
res = call_api("GET", f"{BASE_URL}/category/get/vo?id={test_category_id}")
add_result("category", "GET", "/category/get/vo", "公开", f"分类ID {test_category_id} 存在", f"id={test_category_id}", res, "通过" if res.get("code") == 0 else "失败")

# 2.3 获取所有分类列表
res = call_api("GET", f"{BASE_URL}/category/list")
add_result("category", "GET", "/category/list", "公开", "无", "无", res, "通过" if res.get("code") == 0 else "失败")

# 2.4 管理员分页查询分类
req = {"current": 1, "pageSize": 10}
res = call_api("POST", f"{BASE_URL}/category/list/page", req, admin_cookie)
add_result("category", "POST", "/category/list/page", "管理员", "admin 已登录", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 2.5 管理员更新分类
req = {"id": test_category_id, "name": f"{cat_name}Updated", "sort": 55}
res = call_api("POST", f"{BASE_URL}/category/update", req, admin_cookie)
add_result("category", "POST", "/category/update", "管理员", f"admin 已登录，分类ID {test_category_id}", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 2.6 管理员删除分类
req = {"id": test_category_id}
res = call_api("POST", f"{BASE_URL}/category/delete", req, admin_cookie)
add_result("category", "POST", "/category/delete", "管理员", f"admin 已登录，分类ID {test_category_id}", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# ==================== Tag ====================
# 3.1 管理员添加标签
tag_name = f"TestTag_{random.randint(1000,9999)}"
req = {"name": tag_name, "description": "Test tag desc", "sort": 50}
res = call_api("POST", f"{BASE_URL}/tag/add", req, admin_cookie)
test_tag_id = res.get("data")
add_result("tag", "POST", "/tag/add", "管理员", "admin 已登录", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 3.2 获取标签详情
res = call_api("GET", f"{BASE_URL}/tag/get/vo?id={test_tag_id}")
add_result("tag", "GET", "/tag/get/vo", "公开", f"标签ID {test_tag_id} 存在", f"id={test_tag_id}", res, "通过" if res.get("code") == 0 else "失败")

# 3.3 获取所有标签列表
res = call_api("GET", f"{BASE_URL}/tag/list")
add_result("tag", "GET", "/tag/list", "公开", "无", "无", res, "通过" if res.get("code") == 0 else "失败")

# 3.4 管理员分页查询标签
req = {"current": 1, "pageSize": 10}
res = call_api("POST", f"{BASE_URL}/tag/list/page", req, admin_cookie)
add_result("tag", "POST", "/tag/list/page", "管理员", "admin 已登录", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 3.5 管理员更新标签
req = {"id": test_tag_id, "name": f"{tag_name}Updated", "sort": 55}
res = call_api("POST", f"{BASE_URL}/tag/update", req, admin_cookie)
add_result("tag", "POST", "/tag/update", "管理员", f"admin 已登录，标签ID {test_tag_id}", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 3.6 管理员删除标签
req = {"id": test_tag_id}
res = call_api("POST", f"{BASE_URL}/tag/delete", req, admin_cookie)
add_result("tag", "POST", "/tag/delete", "管理员", f"admin 已登录，标签ID {test_tag_id}", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# ==================== Artwork ====================
# 重新登录普通用户
s = requests.Session()
s.post(f"{BASE_URL}/user/login", json={"userAccount": "testuser001", "userPassword": "12345678"})
user_cookie = dict(s.cookies)

# 4.1 管理员添加艺术作品
art_title = f"TestArtwork_{random.randint(1000,9999)}"
req = {
    "title": art_title,
    "summary": "Test artwork summary",
    "description": "Test artwork description",
    "coverUrl": "https://example.com/test-cover.jpg",
    "videoUrl": "https://example.com/test-video.mp4",
    "promptContent": '{"prompt":"test prompt"}',
    "categoryId": 1,
    "cashPrice": 19.90,
    "pointsPrice": 199,
    "memberOnly": 0,
    "status": 1,
    "tagIds": [1, 2]
}
res = call_api("POST", f"{BASE_URL}/artwork/add", req, admin_cookie)
test_artwork_id = res.get("data")
add_result("artwork", "POST", "/artwork/add", "管理员", "admin 已登录，分类ID 1 存在", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 4.2 获取艺术作品详情
res = call_api("GET", f"{BASE_URL}/artwork/get/vo?id={test_artwork_id}")
add_result("artwork", "GET", "/artwork/get/vo", "公开", f"作品ID {test_artwork_id} 存在", f"id={test_artwork_id}", res, "通过" if res.get("code") == 0 else "失败")

# 4.3 分页查询艺术作品列表（前台）
req = {"current": 1, "pageSize": 10, "categoryId": 1}
res = call_api("POST", f"{BASE_URL}/artwork/list/page/vo", req)
add_result("artwork", "POST", "/artwork/list/page/vo", "公开", "无", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 4.4 管理员分页查询艺术作品列表
req = {"current": 1, "pageSize": 10}
res = call_api("POST", f"{BASE_URL}/artwork/admin/list/page/vo", req, admin_cookie)
add_result("artwork", "POST", "/artwork/admin/list/page/vo", "管理员", "admin 已登录", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 4.5 管理员更新艺术作品
req = {
    "id": test_artwork_id,
    "title": f"{art_title}Updated",
    "summary": "Updated summary",
    "description": "Updated description",
    "coverUrl": "https://example.com/updated-cover.jpg",
    "videoUrl": "https://example.com/updated-video.mp4",
    "promptContent": '{"prompt":"updated prompt"}',
    "categoryId": 1,
    "cashPrice": 29.90,
    "pointsPrice": 299,
    "memberOnly": 0,
    "status": 1,
    "tagIds": [1]
}
res = call_api("POST", f"{BASE_URL}/artwork/update", req, admin_cookie)
add_result("artwork", "POST", "/artwork/update", "管理员", f"admin 已登录，作品ID {test_artwork_id}", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 4.6 管理员删除艺术作品
req = {"id": test_artwork_id}
res = call_api("POST", f"{BASE_URL}/artwork/delete", req, admin_cookie)
add_result("artwork", "POST", "/artwork/delete", "管理员", f"admin 已登录，作品ID {test_artwork_id}", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# ==================== Order ====================
# 为订单测试新建专用作品（避免重复购买限制）
test_artwork_order_title = f"TestOrderArtwork_{random.randint(1000,9999)}"
order_artwork_req = {
    "title": test_artwork_order_title,
    "summary": "For order testing",
    "description": "Order test artwork",
    "coverUrl": "https://example.com/order-cover.jpg",
    "videoUrl": "https://example.com/order-video.mp4",
    "promptContent": '{"prompt":"order test"}',
    "categoryId": 1,
    "cashPrice": 9.90,
    "pointsPrice": 99,
    "memberOnly": 0,
    "status": 1,
    "tagIds": [1]
}
order_artwork_res = call_api("POST", f"{BASE_URL}/artwork/add", order_artwork_req, admin_cookie)
order_test_artwork_id = order_artwork_res.get("data")

# 5.1 创建作品订单 (cash)
req = {"artworkId": int(order_test_artwork_id) if order_test_artwork_id else 2, "orderType": "cash", "paymentChannel": "mock"}
res = call_api("POST", f"{BASE_URL}/order/create", req, user_cookie)
test_order_no = res.get("data", {}).get("orderNo") if isinstance(res.get("data"), dict) else None
add_result("order", "POST", "/order/create", "登录用户", f"testuser001 已登录，作品ID {order_test_artwork_id} 存在", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 5.2 模拟支付成功
req = {"orderNo": test_order_no, "paymentChannel": "mock"}
res = call_api("POST", f"{BASE_URL}/order/pay/mock", req)
add_result("order", "POST", "/order/pay/mock", "公开", f"订单 {test_order_no} 状态为 pending", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 5.3 作品订单支付回调（用另一个新作品创建待支付订单后回调）
callback_artwork_title = f"TestCallbackArtwork_{random.randint(1000,9999)}"
callback_artwork_req = {
    "title": callback_artwork_title,
    "summary": "For callback testing",
    "description": "Callback test artwork",
    "coverUrl": "https://example.com/cb-cover.jpg",
    "videoUrl": "https://example.com/cb-video.mp4",
    "promptContent": '{"prompt":"cb test"}',
    "categoryId": 1,
    "cashPrice": 5.00,
    "pointsPrice": 50,
    "memberOnly": 0,
    "status": 1,
    "tagIds": [1]
}
cb_artwork_res = call_api("POST", f"{BASE_URL}/artwork/add", callback_artwork_req, admin_cookie)
cb_artwork_id = cb_artwork_res.get("data")
new_order_res = call_api("POST", f"{BASE_URL}/order/create", {"artworkId": int(cb_artwork_id) if cb_artwork_id else 2, "orderType": "cash", "paymentChannel": "mock"}, user_cookie)
callback_order_no = new_order_res.get("data", {}).get("orderNo") if isinstance(new_order_res.get("data"), dict) else None
req = {"orderNo": callback_order_no, "paidAmount": 5.00, "paymentChannel": "mock", "thirdPartyOrderNo": f"MOCK-CB-{callback_order_no}"}
res = call_api("POST", f"{BASE_URL}/order/pay/callback", req)
add_result("order", "POST", "/order/pay/callback", "公开/回调", f"订单 {callback_order_no} 状态为 pending", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 5.4 分页查询我的艺术作品订单
req = {"current": 1, "pageSize": 10}
res = call_api("POST", f"{BASE_URL}/order/my/list/page", req, user_cookie)
add_result("order", "POST", "/order/my/list/page", "登录用户", "testuser001 已登录", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 5.5 取消我的待支付艺术作品订单
cancel_artwork_title = f"TestCancelArtwork_{random.randint(1000,9999)}"
cancel_artwork_req = {
    "title": cancel_artwork_title,
    "summary": "For cancel testing",
    "description": "Cancel test artwork",
    "coverUrl": "https://example.com/cancel-cover.jpg",
    "videoUrl": "https://example.com/cancel-video.mp4",
    "promptContent": '{"prompt":"cancel test"}',
    "categoryId": 1,
    "cashPrice": 8.00,
    "pointsPrice": 80,
    "memberOnly": 0,
    "status": 1,
    "tagIds": [1]
}
cancel_artwork_res = call_api("POST", f"{BASE_URL}/artwork/add", cancel_artwork_req, admin_cookie)
cancel_artwork_id = cancel_artwork_res.get("data")
cancel_res = call_api("POST", f"{BASE_URL}/order/create", {"artworkId": int(cancel_artwork_id) if cancel_artwork_id else 2, "orderType": "cash", "paymentChannel": "mock"}, user_cookie)
cancel_order_no = cancel_res.get("data", {}).get("orderNo") if isinstance(cancel_res.get("data"), dict) else None
req = {"orderNo": cancel_order_no}
res = call_api("POST", f"{BASE_URL}/order/cancel", req, user_cookie)
add_result("order", "POST", "/order/cancel", "登录用户", f"testuser001 已登录，待支付订单 {cancel_order_no}", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 5.6 管理员取消艺术作品订单
admin_cancel_artwork_title = f"TestAdminCancelArtwork_{random.randint(1000,9999)}"
admin_cancel_artwork_req = {
    "title": admin_cancel_artwork_title,
    "summary": "For admin cancel testing",
    "description": "Admin cancel test artwork",
    "coverUrl": "https://example.com/admin-cancel-cover.jpg",
    "videoUrl": "https://example.com/admin-cancel-video.mp4",
    "promptContent": '{"prompt":"admin cancel test"}',
    "categoryId": 1,
    "cashPrice": 6.00,
    "pointsPrice": 60,
    "memberOnly": 0,
    "status": 1,
    "tagIds": [1]
}
admin_cancel_artwork_res = call_api("POST", f"{BASE_URL}/artwork/add", admin_cancel_artwork_req, admin_cookie)
admin_cancel_artwork_id = admin_cancel_artwork_res.get("data")
admin_cancel_res = call_api("POST", f"{BASE_URL}/order/create", {"artworkId": int(admin_cancel_artwork_id) if admin_cancel_artwork_id else 2, "orderType": "cash", "paymentChannel": "mock"}, user_cookie)
admin_cancel_order_no = admin_cancel_res.get("data", {}).get("orderNo") if isinstance(admin_cancel_res.get("data"), dict) else None
req = {"orderNo": admin_cancel_order_no}
res = call_api("POST", f"{BASE_URL}/order/admin/cancel", req, admin_cookie)
add_result("order", "POST", "/order/admin/cancel", "管理员", f"admin 已登录，待支付订单 {admin_cancel_order_no}", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 5.7 管理员分页查询艺术作品订单
req = {"current": 1, "pageSize": 10}
res = call_api("POST", f"{BASE_URL}/order/list/page", req, admin_cookie)
add_result("order", "POST", "/order/list/page", "管理员", "admin 已登录", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# ==================== Member ====================
# 6.1 创建会员订单 (cash)
req = {"memberLevel": "plus", "durationDays": 30, "orderType": "cash", "paymentChannel": "mock"}
res = call_api("POST", f"{BASE_URL}/member/order/create", req, user_cookie)
test_member_order_no = res.get("data", {}).get("orderNo") if isinstance(res.get("data"), dict) else None
add_result("member", "POST", "/member/order/create", "登录用户", "testuser001 已登录", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 6.2 模拟会员支付成功
req = {"orderNo": test_member_order_no, "paymentChannel": "mock"}
res = call_api("POST", f"{BASE_URL}/member/pay/mock", req)
add_result("member", "POST", "/member/pay/mock", "公开", f"会员订单 {test_member_order_no} 状态为 pending", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 6.3 会员订单支付回调
new_member_res = call_api("POST", f"{BASE_URL}/member/order/create", {"memberLevel": "plus", "durationDays": 30, "orderType": "cash", "paymentChannel": "mock"}, user_cookie)
callback_member_order_no = new_member_res.get("data", {}).get("orderNo") if isinstance(new_member_res.get("data"), dict) else None
req = {"orderNo": callback_member_order_no, "paidAmount": new_member_res.get("data", {}).get("orderAmount", 0) if isinstance(new_member_res.get("data"), dict) else 0, "paymentChannel": "mock", "thirdPartyOrderNo": f"MOCK-CB-{callback_member_order_no}"}
res = call_api("POST", f"{BASE_URL}/member/pay/callback", req)
add_result("member", "POST", "/member/pay/callback", "公开/回调", f"会员订单 {callback_member_order_no} 状态为 pending", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 6.4 分页查询我的会员订单
req = {"current": 1, "pageSize": 10}
res = call_api("POST", f"{BASE_URL}/member/order/my/list/page", req, user_cookie)
add_result("member", "POST", "/member/order/my/list/page", "登录用户", "testuser001 已登录", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 6.5 取消我的待支付会员订单
cancel_member_res = call_api("POST", f"{BASE_URL}/member/order/create", {"memberLevel": "plus", "durationDays": 30, "orderType": "cash", "paymentChannel": "mock"}, user_cookie)
cancel_member_order_no = cancel_member_res.get("data", {}).get("orderNo") if isinstance(cancel_member_res.get("data"), dict) else None
req = {"orderNo": cancel_member_order_no}
res = call_api("POST", f"{BASE_URL}/member/cancel", req, user_cookie)
add_result("member", "POST", "/member/cancel", "登录用户", f"testuser001 已登录，待支付会员订单 {cancel_member_order_no}", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 6.6 管理员取消会员订单
admin_cancel_member_res = call_api("POST", f"{BASE_URL}/member/order/create", {"memberLevel": "plus", "durationDays": 30, "orderType": "cash", "paymentChannel": "mock"}, user_cookie)
admin_cancel_member_order_no = admin_cancel_member_res.get("data", {}).get("orderNo") if isinstance(admin_cancel_member_res.get("data"), dict) else None
req = {"orderNo": admin_cancel_member_order_no}
res = call_api("POST", f"{BASE_URL}/member/admin/cancel", req, admin_cookie)
add_result("member", "POST", "/member/admin/cancel", "管理员", f"admin 已登录，待支付会员订单 {admin_cancel_member_order_no}", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 6.7 管理员分页查询会员订单
req = {"current": 1, "pageSize": 10}
res = call_api("POST", f"{BASE_URL}/member/order/list/page", req, admin_cookie)
add_result("member", "POST", "/member/order/list/page", "管理员", "admin 已登录", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# 6.8 管理员授予会员权限
req = {"userId": user_id, "memberLevel": "pro", "durationDays": 90, "description": "manual grant for testing"}
res = call_api("POST", f"{BASE_URL}/member/grant", req, admin_cookie)
add_result("member", "POST", "/member/grant", "管理员", f"admin 已登录，目标用户ID {user_id}", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# ==================== Point ====================
# 7.1 获取我的积分概览
res = call_api("GET", f"{BASE_URL}/point/me", cookies=user_cookie)
add_result("point", "GET", "/point/me", "登录用户", "testuser001 已登录", "无", res, "通过" if res.get("code") == 0 else "失败")

# 7.2 每日签到（重复签到返回特定业务码，功能正常）
res = call_api("POST", f"{BASE_URL}/point/check-in", cookies=user_cookie)
check_in_pass = res.get("code") == 0 or (res.get("code") == 50001 and "签到" in str(res.get("message","")))
add_result("point", "POST", "/point/check-in", "登录用户", "testuser001 已登录", "无", res, "通过" if check_in_pass else "失败")

# 7.3 分页查询我的积分记录
req = {"current": 1, "pageSize": 10}
res = call_api("POST", f"{BASE_URL}/point/record/list/page", req, user_cookie)
add_result("point", "POST", "/point/record/list/page", "登录用户", "testuser001 已登录", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# ==================== Operation Log ====================
# 8.1 管理员分页查询操作日志
req = {"current": 1, "pageSize": 10}
res = call_api("POST", f"{BASE_URL}/operation-log/list/page", req, admin_cookie)
add_result("operation-log", "POST", "/operation-log/list/page", "管理员", "admin 已登录", json.dumps(req, ensure_ascii=False), res, "通过" if res.get("code") == 0 else "失败")

# ==================== Save results ====================
with open("test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

passed = sum(1 for r in results if r["conclusion"] == "通过")
failed = sum(1 for r in results if r["conclusion"] == "失败")
print(f"测试完成，共 {len(results)} 条记录")
print(f"通过: {passed}, 失败: {failed}")
if failed > 0:
    for r in results:
        if r["conclusion"] == "失败":
            print(f"失败: {r['method']} {r['path']} -> {r['response']}")
