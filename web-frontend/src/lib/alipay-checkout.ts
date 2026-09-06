export interface AlipayCheckoutWindow {
  name: string;
  window: Window;
}

export function openAlipayCheckoutWindow(): AlipayCheckoutWindow | null {
  const name = `ownai_alipay_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const paymentWindow = window.open("", name);
  if (!paymentWindow) {
    return null;
  }
  paymentWindow.opener = null;
  paymentWindow.document.title = "正在打开支付宝";
  paymentWindow.document.body.textContent = "正在打开支付宝收银台...";
  return { name, window: paymentWindow };
}

export function submitAlipayPaymentForm(paymentFormHtml: string, targetWindowName: string) {
  const documentFragment = new DOMParser().parseFromString(paymentFormHtml, "text/html");
  const sourceForm = documentFragment.querySelector("form");
  if (!sourceForm?.action) {
    throw new Error("支付宝未返回可提交的支付表单");
  }
  const targetForm = document.createElement("form");
  targetForm.method = sourceForm.getAttribute("method") || "post";
  targetForm.action = sourceForm.action;
  targetForm.target = targetWindowName;
  targetForm.style.display = "none";
  sourceForm.querySelectorAll<HTMLInputElement>("input[name]").forEach((sourceInput) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = sourceInput.name;
    input.value = sourceInput.value;
    targetForm.appendChild(input);
  });
  if (!targetForm.elements.length) {
    throw new Error("支付宝支付表单缺少签名参数");
  }
  document.body.appendChild(targetForm);
  targetForm.submit();
  targetForm.remove();
}
