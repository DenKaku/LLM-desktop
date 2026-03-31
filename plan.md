#做一个和本地部署的LLM模型聊天的桌面应用

##系统环境
 - linux ubuntu24

##LLM环境
 - 本地通过ollama部署的LLM

##项目构建需求
 - 使用electron
 - 使用当前文件夹自行创建electron项目
 - 在当前文件夹内进行代码编写
 - api文档参照 https://docs.ollama.com/api/introduction

##画面需求
- 参照微信聊天界面
- 需要可以选择通过ollama部署好的LLM模型的下拉菜单
- 可以选择关闭或选择思考模式程度的下拉菜单，如若用户选择的模型没有思考模式，默认选择为关闭
- 在关闭思考模式的情况下，聊天应答loading时不要显示“思考中”