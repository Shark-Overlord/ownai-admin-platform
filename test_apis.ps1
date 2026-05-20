# 接口全量联调测试脚本
# 前缀: http://localhost:8011/api
$baseUrl = "http://localhost:8011/api"
$results = @()
$adminCookie = $null
$userCookie = $null
$userId = $null
$adminUserId = 1
$testArtworkId = 2
$testOrderNo = $null
$testMemberOrderNo = $null
$testCategoryId = $null
$testTagId = $null

function Add-Result {
    param(
        [string]$Module,
        [string]$Method,
        [string]$Path,
        [string]$AuthType,
        [string]$Precondition,
        [string]$RequestBody,
        [object]$Response,
        [string]$Conclusion,
        [string]$FailReason = ""
    )
    $script:results += [PSCustomObject]@{
        Module = $Module
        Method = $Method
        Path = $Path
        AuthType = $AuthType
        Precondition = $Precondition
        RequestBody = $RequestBody
        Response = $Response | ConvertTo-Json -Depth 5 -Compress
        Conclusion = $Conclusion
        FailReason = $FailReason
    }
}

function Invoke-Api {
    param(
        [string]$Uri,
        [string]$Method = "GET",
        [string]$Body = $null,
        [string]$Cookie = $null
    )
    $headers = @{ "Content-Type" = "application/json" }
    $sess = $null
    if ($Cookie) {
        $sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
        $cookieObj = New-Object System.Net.Cookie
        $cookieObj.Name = $Cookie.Split("=")[0]
        $cookieObj.Value = $Cookie.Split("=")[1]
        $cookieObj.Domain = "localhost"
        $sess.Cookies.Add($cookieObj)
    }
    try {
        if ($Method -eq "GET") {
            if ($sess) { return Invoke-RestMethod -Uri $Uri -Method GET -WebSession $sess -Headers $headers }
            else { return Invoke-RestMethod -Uri $Uri -Method GET -Headers $headers }
        } else {
            if ($sess) { return Invoke-RestMethod -Uri $Uri -Method $Method -Body $Body -ContentType "application/json" -WebSession $sess }
            else { return Invoke-RestMethod -Uri $Uri -Method $Method -Body $Body -ContentType "application/json" }
        }
    } catch {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $reader.BaseStream.Position = 0
            $reader.DiscardBufferedData()
            $errBody = $reader.ReadToEnd()
            return @{ code = $_.Exception.Response.StatusCode.value__; error = $errBody; raw = $_.Exception.Message } | ConvertTo-Json -Depth 3 | ConvertFrom-Json
        } catch {
            return @{ code = -1; error = $_.Exception.Message } | ConvertTo-Json -Depth 3 | ConvertFrom-Json
        }
    }
}

# ===========================================
# 1. User Module
# ===========================================

# 1.1 用户注册
$req = @{ userAccount="testuser001"; userPassword="12345678"; checkPassword="12345678" } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/user/register" -Method POST -Body $req
$userId = $res.data
Add-Result -Module "user" -Method "POST" -Path "/user/register" -AuthType "公开" -Precondition "无" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 1.2 普通用户登录 (获取cookie)
$req = @{ userAccount="testuser001"; userPassword="12345678" } | ConvertTo-Json -Compress
$loginRes = Invoke-WebRequest -Uri "$baseUrl/user/login" -Method POST -Body $req -ContentType "application/json" -SessionVariable sv
$userCookie = ($loginRes.Headers['Set-Cookie'] | Select-String -Pattern 'JSESSIONID=([^;]+)').Matches.Groups[1].Value
$res = $loginRes.Content | ConvertFrom-Json
Add-Result -Module "user" -Method "POST" -Path "/user/login" -AuthType "公开" -Precondition "已注册用户 testuser001" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 1.3 管理员登录 (获取cookie)
$req = @{ userAccount="admin"; userPassword="12345678" } | ConvertTo-Json -Compress
$loginRes2 = Invoke-WebRequest -Uri "$baseUrl/user/login" -Method POST -Body $req -ContentType "application/json" -SessionVariable sv2
$adminCookie = ($loginRes2.Headers['Set-Cookie'] | Select-String -Pattern 'JSESSIONID=([^;]+)').Matches.Groups[1].Value
$res2 = $loginRes2.Content | ConvertFrom-Json
Add-Result -Module "user" -Method "POST" -Path "/user/login (admin)" -AuthType "公开" -Precondition "初始化账号 admin/12345678" -RequestBody $req -Response $res2 -Conclusion $(if($res2.code -eq 0){"通过"}else{"失败"})

# 1.4 获取当前登录用户 (普通用户)
$res = Invoke-Api -Uri "$baseUrl/user/get/login" -Method GET -Cookie "JSESSIONID=$userCookie"
Add-Result -Module "user" -Method "GET" -Path "/user/get/login" -AuthType "登录用户" -Precondition "testuser001 已登录" -RequestBody "无" -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 1.5 用户更新个人信息
$req = @{ userName="Test User Updated"; userProfile="Updated profile" } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/user/update/my" -Method POST -Body $req -Cookie "JSESSIONID=$userCookie"
Add-Result -Module "user" -Method "POST" -Path "/user/update/my" -AuthType "登录用户" -Precondition "testuser001 已登录" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 1.6 获取脱敏用户信息
$res = Invoke-Api -Uri "$baseUrl/user/get/vo?id=$userId" -Method GET
Add-Result -Module "user" -Method "GET" -Path "/user/get/vo" -AuthType "公开" -Precondition "用户ID $userId 存在" -RequestBody "id=$userId" -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 1.7 分页查询脱敏用户列表
$req = @{ current=1; pageSize=10 } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/user/list/page/vo" -Method POST -Body $req
Add-Result -Module "user" -Method "POST" -Path "/user/list/page/vo" -AuthType "公开" -Precondition "无" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 1.8 管理员添加用户
$req = @{ userAccount="testadminadd"; userName="Admin Added User"; userRole="user"; memberLevel="normal"; pointBalance=100 } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/user/add" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
$addedUserId = $res.data
Add-Result -Module "user" -Method "POST" -Path "/user/add" -AuthType "管理员" -Precondition "admin 已登录" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 1.9 管理员根据ID获取用户
$res = Invoke-Api -Uri "$baseUrl/user/get?id=$addedUserId" -Method GET -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "user" -Method "GET" -Path "/user/get" -AuthType "管理员" -Precondition "admin 已登录，用户ID $addedUserId 存在" -RequestBody "id=$addedUserId" -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 1.10 管理员更新用户
$req = @{ id=$addedUserId; userName="Updated Admin User"; pointBalance=200 } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/user/update" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "user" -Method "POST" -Path "/user/update" -AuthType "管理员" -Precondition "admin 已登录，目标用户ID $addedUserId" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 1.11 管理员分页查询用户
$req = @{ current=1; pageSize=10 } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/user/list/page" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "user" -Method "POST" -Path "/user/list/page" -AuthType "管理员" -Precondition "admin 已登录" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 1.12 用户登出
$res = Invoke-Api -Uri "$baseUrl/user/logout" -Method POST -Cookie "JSESSIONID=$userCookie"
Add-Result -Module "user" -Method "POST" -Path "/user/logout" -AuthType "登录用户" -Precondition "testuser001 已登录" -RequestBody "无" -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 1.13 管理员删除用户
$req = @{ id=$addedUserId } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/user/delete" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "user" -Method "POST" -Path "/user/delete" -AuthType "管理员" -Precondition "admin 已登录，目标用户ID $addedUserId" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# ===========================================
# 2. Category Module
# ===========================================

# 2.1 管理员添加分类
$req = @{ name="TestCategory_$(Get-Random)"; description="Test category desc"; sort=50 } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/category/add" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
$testCategoryId = $res.data
Add-Result -Module "category" -Method "POST" -Path "/category/add" -AuthType "管理员" -Precondition "admin 已登录" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 2.2 获取分类详情
$res = Invoke-Api -Uri "$baseUrl/category/get/vo?id=$testCategoryId" -Method GET
Add-Result -Module "category" -Method "GET" -Path "/category/get/vo" -AuthType "公开" -Precondition "分类ID $testCategoryId 存在" -RequestBody "id=$testCategoryId" -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 2.3 获取所有分类列表
$res = Invoke-Api -Uri "$baseUrl/category/list" -Method GET
Add-Result -Module "category" -Method "GET" -Path "/category/list" -AuthType "公开" -Precondition "无" -RequestBody "无" -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 2.4 管理员分页查询分类
$req = @{ current=1; pageSize=10 } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/category/list/page" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "category" -Method "POST" -Path "/category/list/page" -AuthType "管理员" -Precondition "admin 已登录" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 2.5 管理员更新分类
$req = @{ id=$testCategoryId; name="TestCategoryUpdated"; sort=55 } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/category/update" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "category" -Method "POST" -Path "/category/update" -AuthType "管理员" -Precondition "admin 已登录，分类ID $testCategoryId" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 2.6 管理员删除分类
$req = @{ id=$testCategoryId } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/category/delete" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "category" -Method "POST" -Path "/category/delete" -AuthType "管理员" -Precondition "admin 已登录，分类ID $testCategoryId" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else {"失败"})

# ===========================================
# 3. Tag Module
# ===========================================

# 3.1 管理员添加标签
$req = @{ name="TestTag_$(Get-Random)"; description="Test tag desc"; sort=50 } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/tag/add" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
$testTagId = $res.data
Add-Result -Module "tag" -Method "POST" -Path "/tag/add" -AuthType "管理员" -Precondition "admin 已登录" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 3.2 获取标签详情
$res = Invoke-Api -Uri "$baseUrl/tag/get/vo?id=$testTagId" -Method GET
Add-Result -Module "tag" -Method "GET" -Path "/tag/get/vo" -AuthType "公开" -Precondition "标签ID $testTagId 存在" -RequestBody "id=$testTagId" -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 3.3 获取所有标签列表
$res = Invoke-Api -Uri "$baseUrl/tag/list" -Method GET
Add-Result -Module "tag" -Method "GET" -Path "/tag/list" -AuthType "公开" -Precondition "无" -RequestBody "无" -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 3.4 管理员分页查询标签
$req = @{ current=1; pageSize=10 } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/tag/list/page" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "tag" -Method "POST" -Path "/tag/list/page" -AuthType "管理员" -Precondition "admin 已登录" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 3.5 管理员更新标签
$req = @{ id=$testTagId; name="TestTagUpdated"; sort=55 } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/tag/update" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "tag" -Method "POST" -Path "/tag/update" -AuthType "管理员" -Precondition "admin 已登录，标签ID $testTagId" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 3.6 管理员删除标签
$req = @{ id=$testTagId } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/tag/delete" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "tag" -Method "POST" -Path "/tag/delete" -AuthType "管理员" -Precondition "admin 已登录，标签ID $testTagId" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else {"失败"})

# ===========================================
# 4. Artwork Module
# ===========================================

# 4.1 管理员添加艺术作品
$req = @{
    title="TestArtwork_$(Get-Random)"
    summary="Test artwork summary"
    description="Test artwork description"
    coverUrl="https://example.com/test-cover.jpg"
    videoUrl="https://example.com/test-video.mp4"
    promptContent='{"prompt":"test prompt"}'
    categoryId=1
    cashPrice=19.90
    pointsPrice=199
    memberOnly=0
    status=1
    tagIds=(1,2)
} | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/artwork/add" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
$testArtworkId = $res.data
Add-Result -Module "artwork" -Method "POST" -Path "/artwork/add" -AuthType "管理员" -Precondition "admin 已登录，分类ID 1 存在" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 4.2 获取艺术作品详情 (前台，未登录)
$res = Invoke-Api -Uri "$baseUrl/artwork/get/vo?id=$testArtworkId" -Method GET
Add-Result -Module "artwork" -Method "GET" -Path "/artwork/get/vo" -AuthType "公开" -Precondition "作品ID $testArtworkId 存在" -RequestBody "id=$testArtworkId" -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 4.3 分页查询艺术作品列表（前台）
$req = @{ current=1; pageSize=10; categoryId=1 } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/artwork/list/page/vo" -Method POST -Body $req
Add-Result -Module "artwork" -Method "POST" -Path "/artwork/list/page/vo" -AuthType "公开" -Precondition "无" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 4.4 管理员分页查询艺术作品列表
$req = @{ current=1; pageSize=10 } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/artwork/admin/list/page/vo" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "artwork" -Method "POST" -Path "/artwork/admin/list/page/vo" -AuthType "管理员" -Precondition "admin 已登录" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 4.5 管理员更新艺术作品
$req = @{
    id=$testArtworkId
    title="TestArtworkUpdated"
    summary="Updated summary"
    description="Updated description"
    coverUrl="https://example.com/updated-cover.jpg"
    videoUrl="https://example.com/updated-video.mp4"
    promptContent='{"prompt":"updated prompt"}'
    categoryId=1
    cashPrice=29.90
    pointsPrice=299
    memberOnly=0
    status=1
    tagIds=(1)
} | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/artwork/update" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "artwork" -Method "POST" -Path "/artwork/update" -AuthType "管理员" -Precondition "admin 已登录，作品ID $testArtworkId" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 4.6 管理员删除艺术作品
$req = @{ id=$testArtworkId } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/artwork/delete" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "artwork" -Method "POST" -Path "/artwork/delete" -AuthType "管理员" -Precondition "admin 已登录，作品ID $testArtworkId" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# ===========================================
# 5. Order Module
# ===========================================

# 重新登录普通用户获取session
$req = @{ userAccount="testuser001"; userPassword="12345678" } | ConvertTo-Json -Compress
$loginRes = Invoke-WebRequest -Uri "$baseUrl/user/login" -Method POST -Body $req -ContentType "application/json" -SessionVariable sv
$userCookie = ($loginRes.Headers['Set-Cookie'] | Select-String -Pattern 'JSESSIONID=([^;]+)').Matches.Groups[1].Value

# 5.1 创建作品订单 (cash)
$req = @{ artworkId=2; orderType="cash"; paymentChannel="mock" } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/order/create" -Method POST -Body $req -Cookie "JSESSIONID=$userCookie"
$testOrderNo = $res.data.orderNo
Add-Result -Module "order" -Method "POST" -Path "/order/create" -AuthType "登录用户" -Precondition "testuser001 已登录，作品ID 2 存在" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 5.2 模拟支付成功
$req = @{ orderNo=$testOrderNo; paymentChannel="mock" } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/order/pay/mock" -Method POST -Body $req
Add-Result -Module "order" -Method "POST" -Path "/order/pay/mock" -AuthType "公开" -Precondition "订单 $testOrderNo 状态为 pending" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 5.3 作品订单支付回调 (再次构造回调)
$newOrderReq = @{ artworkId=2; orderType="cash"; paymentChannel="mock" } | ConvertTo-Json -Compress
$newOrderRes = Invoke-Api -Uri "$baseUrl/order/create" -Method POST -Body $newOrderReq -Cookie "JSESSIONID=$userCookie"
$callbackOrderNo = $newOrderRes.data.orderNo
$req = @{ orderNo=$callbackOrderNo; paidAmount=29.90; paymentChannel="mock"; thirdPartyOrderNo="MOCK-CB-$callbackOrderNo" } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/order/pay/callback" -Method POST -Body $req
Add-Result -Module "order" -Method "POST" -Path "/order/pay/callback" -AuthType "公开/回调" -Precondition "订单 $callbackOrderNo 状态为 pending" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 5.4 分页查询我的艺术作品订单
$req = @{ current=1; pageSize=10 } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/order/my/list/page" -Method POST -Body $req -Cookie "JSESSIONID=$userCookie"
Add-Result -Module "order" -Method "POST" -Path "/order/my/list/page" -AuthType "登录用户" -Precondition "testuser001 已登录" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 5.5 创建待取消订单 + 取消我的待支付艺术作品订单
$req = @{ artworkId=2; orderType="cash"; paymentChannel="mock" } | ConvertTo-Json -Compress
$cancelRes = Invoke-Api -Uri "$baseUrl/order/create" -Method POST -Body $req -Cookie "JSESSIONID=$userCookie"
$cancelOrderNo = $cancelRes.data.orderNo
$req = @{ orderNo=$cancelOrderNo } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/order/cancel" -Method POST -Body $req -Cookie "JSESSIONID=$userCookie"
Add-Result -Module "order" -Method "POST" -Path "/order/cancel" -AuthType "登录用户" -Precondition "testuser001 已登录，待支付订单 $cancelOrderNo" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 5.6 管理员取消艺术作品订单
$req = @{ artworkId=2; orderType="cash"; paymentChannel="mock" } | ConvertTo-Json -Compress
$adminCancelRes = Invoke-Api -Uri "$baseUrl/order/create" -Method POST -Body $req -Cookie "JSESSIONID=$userCookie"
$adminCancelOrderNo = $adminCancelRes.data.orderNo
$req = @{ orderNo=$adminCancelOrderNo } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/order/admin/cancel" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "order" -Method "POST" -Path "/order/admin/cancel" -AuthType "管理员" -Precondition "admin 已登录，待支付订单 $adminCancelOrderNo" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 5.7 管理员分页查询艺术作品订单
$req = @{ current=1; pageSize=10 } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/order/list/page" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "order" -Method "POST" -Path "/order/list/page" -AuthType "管理员" -Precondition "admin 已登录" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# ===========================================
# 6. Member Module
# ===========================================

# 6.1 创建会员订单 (cash)
$req = @{ memberLevel="plus"; durationDays=30; orderType="cash"; paymentChannel="mock" } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/member/order/create" -Method POST -Body $req -Cookie "JSESSIONID=$userCookie"
$testMemberOrderNo = $res.data.orderNo
Add-Result -Module "member" -Method "POST" -Path "/member/order/create" -AuthType "登录用户" -Precondition "testuser001 已登录" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 6.2 模拟会员支付成功
$req = @{ orderNo=$testMemberOrderNo; paymentChannel="mock" } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/member/pay/mock" -Method POST -Body $req
Add-Result -Module "member" -Method "POST" -Path "/member/pay/mock" -AuthType "公开" -Precondition "会员订单 $testMemberOrderNo 状态为 pending" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 6.3 会员订单支付回调
$newMemberReq = @{ memberLevel="plus"; durationDays=30; orderType="cash"; paymentChannel="mock" } | ConvertTo-Json -Compress
$newMemberRes = Invoke-Api -Uri "$baseUrl/member/order/create" -Method POST -Body $newMemberReq -Cookie "JSESSIONID=$userCookie"
$callbackMemberOrderNo = $newMemberRes.data.orderNo
$req = @{ orderNo=$callbackMemberOrderNo; paidAmount=$newMemberRes.data.orderAmount; paymentChannel="mock"; thirdPartyOrderNo="MOCK-CB-$callbackMemberOrderNo" } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/member/pay/callback" -Method POST -Body $req
Add-Result -Module "member" -Method "POST" -Path "/member/pay/callback" -AuthType "公开/回调" -Precondition "会员订单 $callbackMemberOrderNo 状态为 pending" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 6.4 分页查询我的会员订单
$req = @{ current=1; pageSize=10 } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/member/order/my/list/page" -Method POST -Body $req -Cookie "JSESSIONID=$userCookie"
Add-Result -Module "member" -Method "POST" -Path "/member/order/my/list/page" -AuthType "登录用户" -Precondition "testuser001 已登录" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 6.5 取消我的待支付会员订单
$cancelMemberReq = @{ memberLevel="plus"; durationDays=30; orderType="cash"; paymentChannel="mock" } | ConvertTo-Json -Compress
$cancelMemberRes = Invoke-Api -Uri "$baseUrl/member/order/create" -Method POST -Body $cancelMemberReq -Cookie "JSESSIONID=$userCookie"
$cancelMemberOrderNo = $cancelMemberRes.data.orderNo
$req = @{ orderNo=$cancelMemberOrderNo } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/member/cancel" -Method POST -Body $req -Cookie "JSESSIONID=$userCookie"
Add-Result -Module "member" -Method "POST" -Path "/member/cancel" -AuthType "登录用户" -Precondition "testuser001 已登录，待支付会员订单 $cancelMemberOrderNo" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 6.6 管理员取消会员订单
$adminCancelMemberReq = @{ memberLevel="plus"; durationDays=30; orderType="cash"; paymentChannel="mock" } | ConvertTo-Json -Compress
$adminCancelMemberRes = Invoke-Api -Uri "$baseUrl/member/order/create" -Method POST -Body $adminCancelMemberReq -Cookie "JSESSIONID=$userCookie"
$adminCancelMemberOrderNo = $adminCancelMemberRes.data.orderNo
$req = @{ orderNo=$adminCancelMemberOrderNo } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/member/admin/cancel" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "member" -Method "POST" -Path "/member/admin/cancel" -AuthType "管理员" -Precondition "admin 已登录，待支付会员订单 $adminCancelMemberOrderNo" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 6.7 管理员分页查询会员订单
$req = @{ current=1; pageSize=10 } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/member/order/list/page" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "member" -Method "POST" -Path "/member/order/list/page" -AuthType "管理员" -Precondition "admin 已登录" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 6.8 管理员授予会员权限
$req = @{ userId=$userId; memberLevel="pro"; durationDays=90; description="manual grant for testing" } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/member/grant" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "member" -Method "POST" -Path "/member/grant" -AuthType "管理员" -Precondition "admin 已登录，目标用户ID $userId" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# ===========================================
# 7. Point Module
# ===========================================

# 7.1 获取我的积分概览
$res = Invoke-Api -Uri "$baseUrl/point/me" -Method GET -Cookie "JSESSIONID=$userCookie"
Add-Result -Module "point" -Method "GET" -Path "/point/me" -AuthType "登录用户" -Precondition "testuser001 已登录" -RequestBody "无" -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 7.2 每日签到
$res = Invoke-Api -Uri "$baseUrl/point/check-in" -Method POST -Cookie "JSESSIONID=$userCookie"
Add-Result -Module "point" -Method "POST" -Path "/point/check-in" -AuthType "登录用户" -Precondition "testuser001 已登录" -RequestBody "无" -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# 7.3 分页查询我的积分记录
$req = @{ current=1; pageSize=10 } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/point/record/list/page" -Method POST -Body $req -Cookie "JSESSIONID=$userCookie"
Add-Result -Module "point" -Method "POST" -Path "/point/record/list/page" -AuthType "登录用户" -Precondition "testuser001 已登录" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# ===========================================
# 8. Operation Log Module
# ===========================================

# 8.1 管理员分页查询操作日志
$req = @{ current=1; pageSize=10 } | ConvertTo-Json -Compress
$res = Invoke-Api -Uri "$baseUrl/operation-log/list/page" -Method POST -Body $req -Cookie "JSESSIONID=$adminCookie"
Add-Result -Module "operation-log" -Method "POST" -Path "/operation-log/list/page" -AuthType "管理员" -Precondition "admin 已登录" -RequestBody $req -Response $res -Conclusion $(if($res.code -eq 0){"通过"}else{"失败"})

# ===========================================
# 保存结果
# ===========================================
$results | Export-Csv -Path "test_results.csv" -NoTypeInformation -Encoding UTF8
$results | ConvertTo-Json -Depth 5 | Out-File -FilePath "test_results.json" -Encoding UTF8
Write-Host "测试完成，共 $($results.Count) 条记录"
$passed = ($results | Where-Object { $_.Conclusion -eq "通过" }).Count
$failed = ($results | Where-Object { $_.Conclusion -eq "失败" }).Count
Write-Host "通过: $passed, 失败: $failed"
