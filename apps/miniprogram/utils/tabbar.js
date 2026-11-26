// 自定义 tabBar 选中态同步：每个 tab 页 onShow 调用，传入自身实例与索引。
// 微信规定每个 tab 页持有独立的 tabBar 组件实例，须逐页 setData。
function setSelected(page, index) {
  if (typeof page.getTabBar === 'function') {
    const bar = page.getTabBar();
    if (bar) bar.setData({ selected: index });
  }
}

module.exports = { setSelected: setSelected };
