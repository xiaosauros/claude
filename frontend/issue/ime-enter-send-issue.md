# IME 下 Enter 发送问题

> 适用场景：输入框回车发送、中文/日文 IME 输入场景。

- **双语义冲突**：IME（中文/日文）下 Enter 兼具「确认候选词」与「发送」两种语义，不能只靠 keydown 的 `isComposing`/`keyCode` 判断。
- **事件顺序陷阱**：部分平台（部分 IME / Safari / Webview）事件顺序异常，`compositionend` 先于 keydown 到达，此时 `isComposing` 已变 false，守卫漏判 → 选字回车被误当发送。
- **根治方案**：用 `composingRef` 维护 composing 状态，并加 `justComposedRef`，在 `compositionend` 后用 `setTimeout(0)` 留一帧窗口，窗内的 Enter 视为选字、不发送。
- **异步状态竞态**：`submit()` 读到旧 text、`setText('')` 又被后到的 `compositionend` 覆盖 → `send()` 兜底从 `taRef.current.value` 读 DOM 实际值。
