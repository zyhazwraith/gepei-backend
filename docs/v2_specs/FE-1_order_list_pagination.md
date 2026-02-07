# FE-1 订单列表无限滚动改造规范 (Order List Pagination)

## 1. 背景与现状 (Context)

### 1.1 现状 (As-Is)
*   **前端**: `OrderList.tsx` 在组件挂载或 Tab 切换时，调用 `getOrders(activeTab, roleTab)`。
*   **后端**: `getOrders` 控制器一次性查询符合条件的所有订单，按时间倒序排列。
*   **问题**: 随着订单量增加，全量加载将导致首屏变慢、流量浪费，且不符合移动端列表交互习惯。

### 1.2 目标 (To-Be)
*   **交互**: 实现标准的移动端“上拉加载更多” (Infinite Scroll)。
*   **性能**: 每次只加载一页数据 (默认 10 条)。
*   **体验**: 
    *   初始加载显示骨架屏或 Spinner。
    *   滚动到底部自动加载下一页。
    *   没有更多数据时显示明确提示。

---

## 2. 接口变更规范 (API Changes)

需要改造 `GET /api/v1/orders` 接口。

### 2.1 请求参数 (Request)
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `page` | number | No | 1 | 当前页码 (从1开始) |
| `limit` | number | No | 10 | 每页条数 |
| `status`| string | No | 'all'| 筛选状态 |
| `role` | string | No | 'user'| 角色视角 |

### 2.2 响应结构 (Response)
**原结构**: `Order[]` (直接返回数组)
**新结构**:
```typescript
{
  code: 0,
  message: "success",
  data: {
    list: OrderDetailResponse[], // 当前页数据
    pagination: {
      total: number,       // 总条数
      page: number,        // 当前页
      pageSize: number,    // 每页条数 (limit)
      totalPages: number   // 总页数
    }
  }
}
```

---

## 3. UI/UX 交互细节

### 3.1 状态定义
*   `orders`: 列表数据源 (Array)。
*   `page`: 当前页码，初始为 1。
*   `hasMore`: 是否还有更多数据 (`page < totalPages`)。
*   `loading`: 初始加载状态 (First Load)。
*   `loadingMore`: 追加加载状态 (Append Load)。

### 3.2 交互逻辑
1.  **初始进入 / 切换 Tab**:
    *   重置 `orders = []`, `page = 1`, `hasMore = true`。
    *   设置 `loading = true`。
    *   调用 API。
    *   渲染: 如果数据为空 -> 显示 `EmptyState`；否则显示第一页数据。

2.  **滚动到底部**:
    *   触发条件: `inView` (Observer) && `!loading` && `!loadingMore` && `hasMore`。
    *   设置 `loadingMore = true`。
    *   `page = page + 1`。
    *   调用 API。
    *   渲染: 将新数据 `append` 到 `orders` 尾部。

3.  **底部加载条 (Loader UI)**:
    *   当 `loadingMore === true` 时: 显示 "加载中... (Spinner)"。
    *   当 `hasMore === true` 但非加载中: 显示 "上拉加载更多" (透明或浅色，用于占位)。
    *   当 `hasMore === false` 且 `orders.length > 0`: 显示 "没有更多记录了"。

---

## 4. 技术实现 (Implementation)

### 4.1 依赖
*   `react-intersection-observer`: 用于监听底部元素可见性。

### 4.2 关键代码片段 (伪代码)

```typescript
// 状态管理
const [page, setPage] = useState(1);
const [orders, setOrders] = useState([]);
const { ref, inView } = useInView();

// 数据获取
const fetchOrders = async (pageNum, isLoadMore) => {
  if (isLoadMore) setLoadingMore(true);
  else setLoading(true);
  
  const res = await api.getOrders({ ...params, page: pageNum });
  
  if (isLoadMore) {
    setOrders(prev => [...prev, ...res.list]);
  } else {
    setOrders(res.list);
  }
  // 更新 hasMore
}

// 监听滚动
useEffect(() => {
  if (inView && hasMore && !loadingMore) {
    const next = page + 1;
    setPage(next);
    fetchOrders(next, true);
  }
}, [inView]);

// 监听 Tab 切换
useEffect(() => {
  setPage(1);
  setOrders([]);
  fetchOrders(1, false);
}, [activeTab]);
```

## 5. 影响范围 (Impact)
*   **后端**: 修改 `server/controllers/order.controller.ts`。
*   **前端 API**: 修改 `client/src/lib/api.ts` 类型定义。
*   **前端页面**: 重构 `client/src/pages/OrderList.tsx`。
