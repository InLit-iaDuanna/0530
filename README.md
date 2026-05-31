# 山洞迷宫

一个使用本地 GLB 石墙模型搭建的 Three.js 山洞迷宫。页面不引用 CDN，适合部署在内网。

## 桌面端调试

```powershell
npm install
npm run dev
```

HTTP 服务默认监听 `0.0.0.0:5188`，电脑浏览器可以打开：

```text
http://localhost:5188
```

桌面端使用鼠标控制视角，`WASD` 或方向键移动。

## 手机端踏步模式

手机浏览器要读取运动和方向传感器，必须使用 HTTPS。可以直接生成本地证书：

```powershell
npm run cert
```

这个命令会生成：

```text
certs/cert.pem
certs/key.pem
certs/cave-maze-root-ca.cer
public/cave-maze-root-ca.cer
```

如果电脑内网 IP 不是 `192.168.31.24`，修改 `package.json` 里的 `cert` 脚本，把 IP 换成当前电脑的 IPv4 地址，然后重新运行 `npm run cert`。

启动 HTTPS 服务：

```powershell
npm run https
```

手机和电脑连接同一个内网后，用手机打开：

```text
https://192.168.31.24:8443
```

如果手机提示证书不受信任，需要先安装并信任根证书。根证书文件是：

```text
C:\Users\marve\Desktop\5.30黑客松\拼接版本\certs\cave-maze-root-ca.cer
```

也可以在 HTTP 服务运行时用手机打开下面地址下载：

```text
http://192.168.31.24:5188/cave-maze-root-ca.cer
```

## 手机玩法

点击“允许传感器并校准方向”，授权运动与方向传感器。站在起点，手机平视并面向你要前进的现实方向，点击“确认当前方向”。校准后原地踏步前进，停止踏步会逐渐停下，转动手机会改变视角和前进方向。

## 静态构建

```powershell
npm run build
```

构建产物会输出到 `dist`。模型、脚本、样式和 Three.js 本地依赖会一起复制进去。
