export const CHANNELS = ["官網", "Line", "親洽", "Pinkoi", "Momo", "QDM", "綿谷"];

export const CATEGORIES = ["商品＿BB鮮", "商品＿AA乾", "週花", "課程"];

export const PAYMENT_METHODS = [
  "現金",
  "Line Pay",
  "信用卡",
  "銀行轉帳-玉山",
  "銀行轉帳-Line Bank",
  "銀行轉帳-元大",
  "銀行轉帳-台新",
  "零用金",
];

export const RECEIPT_TYPES = ["收據", "發票", "無憑證"];

export const INCOME_SUBJECTS: Record<string, string[]> = {
  學費: ["QDM", "Line", "親洽"],
  週花: ["QDM", "Line", "親洽"],
  商品銷售: ["QDM", "官網", "Line", "Pinkoi", "親洽", "Momo", "綿谷"],
  "＊其他": ["＊其他"],
};

export const EXPENSE_SUBJECTS: Record<string, string[]> = {
  薪資: ["Lily", "Christine", "瀞惠", "抹茶"],
  交通運費: ["計程車", "黑貓", "Lalamove", "楊大哥", "店到店", "＊其他"],
  花材: ["排骨", "亞生", "花誠", "桐林", "＊其他"],
  資材: ["信苑", "袋袋相傳", "＊其他"],
  耗材: ["辦公文具", "提袋", "酷卡", "賀卡紙", "Logo貼紙", "＊其他"],
  規費: ["水費", "電費", "瓦斯費", "房租", "營業稅", "健保", "關貿", "QDM平台費"],
  廣告費: ["FB", "IG", "Line", "Pinkoi", "Momo"],
  設備: ["＊其他"],
  "＊其他": ["＊其他"],
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "待確認",
  CONFIRMED: "已確認",
  SHIPPED: "已出貨",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID: "已付款",
  UNPAID: "未付款",
  PARTIAL: "部分付款",
};

export const ADVANCE_STATUS_LABELS: Record<string, string> = {
  PENDING: "待核銷",
  REIMBURSED: "已核銷",
};

export const SHIPPING_FIELDS = [
  { key: "orderNumber", label: "訂單編號" },
  { key: "channel", label: "通路" },
  { key: "productName", label: "商品名稱" },
  { key: "spec", label: "規格" },
  { key: "quantity", label: "數量" },
  { key: "totalAmount", label: "金額" },
  { key: "buyerName", label: "訂購人" },
  { key: "buyerPhone", label: "訂購人電話" },
  { key: "recipientName", label: "收件人" },
  { key: "recipientPhone", label: "收件電話" },
  { key: "address", label: "配送地址" },
  { key: "deliveryMethod", label: "配送方式" },
  { key: "shippingDate", label: "出貨日期" },
  { key: "notes", label: "備註" },
];
