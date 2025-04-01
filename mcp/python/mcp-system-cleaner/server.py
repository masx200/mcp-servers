import os
import platform
import shutil
import psutil
import re
import json
import logging
import hashlib
import threading
from pathlib import Path
from typing import List, Dict, Optional, Union
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from mcp.server.fastmcp import FastMCP

# 初始化MCP服务器
mcp = FastMCP(name="system_cleaner", log_level="ERROR")

# ======================
# 配置常量
# ======================
DEFAULT_CONFIG = {
    "version": "1.2.0",
    "scan_paths": {
        "windows": [
            {"path": "%TEMP%", "enabled": True, "recursive": True},
            {"path": "%LOCALAPPDATA%\\Temp", "enabled": True, "recursive": True},
            {"path": "C:\\Windows\\Temp", "enabled": True, "recursive": False},
            {"path": "%USERPROFILE%\\AppData\\Local\\Microsoft\\Windows\\INetCache", "enabled": True, "recursive": True},
            {"path": "%USERPROFILE%\\AppData\\Local\\Microsoft\\Windows\\History", "enabled": True, "recursive": True},
            {"path": "%USERPROFILE%\\AppData\\Local\\CrashDumps", "enabled": True, "recursive": True},
            {"path": "%USERPROFILE%\\AppData\\Local\\Microsoft\\Windows\\WER", "enabled": True, "recursive": True},
            {"path": "%USERPROFILE%\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cache", "enabled": True, "recursive": True},
            {"path": "%USERPROFILE%\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Cache", "enabled": True, "recursive": True},
            {"path": "%USERPROFILE%\\AppData\\Local\\Mozilla\\Firefox\\Profiles", "enabled": True, "recursive": True},
            {"path": "%SYSTEMROOT%\\SoftwareDistribution\\Download", "enabled": True, "recursive": True},
            {"path": "%SYSTEMROOT%\\Prefetch", "enabled": True, "recursive": False}
        ],
        "macos": [
            {"path": "~/Library/Caches", "enabled": True, "recursive": True},
            {"path": "/private/var/tmp", "enabled": True, "recursive": True},
            {"path": "~/Library/Logs", "enabled": True, "recursive": True},
            {"path": "~/Library/Application Support/CrashReporter", "enabled": True, "recursive": True},
            {"path": "~/Library/Containers/com.apple.Safari/Data/Library/Caches", "enabled": True, "recursive": True},
            {"path": "~/Library/Application Support/Google/Chrome/Default/Cache", "enabled": True, "recursive": True},
            {"path": "~/Library/Application Support/Firefox/Profiles", "enabled": True, "recursive": True},
            {"path": "~/Library/Developer/Xcode/DerivedData", "enabled": True, "recursive": True},
            {"path": "~/Library/Developer/Xcode/Archives", "enabled": True, "recursive": True},
            {"path": "/private/var/log", "enabled": True, "recursive": True},
            {"path": "~/Library/iTunes/iPhone Software Updates", "enabled": True, "recursive": False},
            {"path": "~/Library/Cookies", "enabled": True, "recursive": False}
        ],
        "linux": [
            {"path": "/tmp", "enabled": True, "recursive": True},
            {"path": "~/.cache", "enabled": True, "recursive": True},
            {"path": "/var/cache", "enabled": True, "recursive": True},
            {"path": "/var/log", "enabled": True, "recursive": True},
            {"path": "/var/tmp", "enabled": True, "recursive": True},
            {"path": "~/.local/share/Trash", "enabled": True, "recursive": True},
            {"path": "~/.mozilla/firefox", "enabled": True, "recursive": True},
            {"path": "~/.config/google-chrome/Default/Cache", "enabled": True, "recursive": True},
            {"path": "~/.config/chromium/Default/Cache", "enabled": True, "recursive": True},
            {"path": "~/.thumbnails", "enabled": True, "recursive": True},
            {"path": "~/.local/share/Trash", "enabled": True, "recursive": True},
            {"path": "~/.npm", "enabled": True, "recursive": True},
            {"path": "~/.yarn/cache", "enabled": True, "recursive": True}
        ]
    },
    "file_rules": {
        "extensions": [".tmp", ".log", ".cache", ".bak", ".old", ".dmp", ".swp", ".dump", ".chk", ".temp", ".crdownload"],
        "name_patterns": [r"^temp_", r"^cache_", r"\.bak$", r"~$", r"\.old$", r"^log\d*\."],
        "min_size_mb": 10,
        "max_age_days": 30,
        "content_types": ["text", "binary"],
        "max_threads": 4,
        "exclude_patterns": [r"\.config", r"\.settings", r"important", r"\.key$", r"\.pem$"]
    },
    "security": {
        "secure_delete": False,
        "overwrite_passes": 3,
        "backup_enabled": False,
        "backup_dir": "~/system_cleaner_backups",
        "backup_max_size_mb": 500,
        "ask_confirmation": True,
        "exclude_system_critical": True
    }
}


# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# ======================
# 工具函数
# ======================
def get_os_type() -> str:
    """获取操作系统类型"""
    system = platform.system().lower()
    if system == "windows":
        return "windows"
    elif system == "darwin":
        return "macos"
    return "linux"


def load_config() -> Dict:
    """加载配置文件"""
    try:
        if CONFIG_FILE.exists():
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
                # 配置版本迁移
                if config.get("version") != DEFAULT_CONFIG["version"]:
                    config = migrate_config(config)
                return config
    except Exception as e:
        logger.error(f"加载配置失败: {e}")
    return DEFAULT_CONFIG


def save_config(config: Dict):
    """保存配置文件"""
    try:
        CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        logger.error(f"保存配置失败: {e}")


def migrate_config(old_config: Dict) -> Dict:
    """配置版本迁移"""
    # 这里可以添加从旧版本到新版本的迁移逻辑
    return {**DEFAULT_CONFIG, **old_config}


def expand_path(path: str, os_type: str) -> str:
    """展开路径中的环境变量和用户目录"""
    try:
        if os_type == "windows":
            path = os.path.expandvars(path)
        return os.path.expanduser(path)
    except Exception as e:
        logger.warning(f"路径展开失败: {path}, 错误: {e}")
        return path


def analyze_file(file_path: str, config: Dict) -> Optional[Dict]:
    """分析文件信息"""
    try:
        stat = os.stat(file_path)
        ext = os.path.splitext(file_path)[1].lower()
        file_name = os.path.basename(file_path)

        # 检查文件年龄
        file_age = (datetime.now() - datetime.fromtimestamp(stat.st_mtime)).days
        if file_age < config["file_rules"]["max_age_days"]:
            return None

        # 检查文件扩展名
        if ext not in config["file_rules"]["extensions"]:
            return None

        # 检查文件名模式
        name_patterns = config["file_rules"].get("name_patterns", [])
        if name_patterns and not any(re.match(p, file_name) for p in name_patterns):
            return None

        return {
            "path": file_path,
            "size": stat.st_size,
            "modified": stat.st_mtime,
            "extension": ext,
            "is_file": True,
            "is_dir": False
        }
    except Exception as e:
        logger.warning(f"文件分析失败: {file_path}, 错误: {e}")
        return None


def secure_delete(file_path: str, passes: int = 3):
    """安全删除文件"""
    try:
        file_size = os.path.getsize(file_path)
        with open(file_path, "ba+") as f:
            for _ in range(passes):
                f.seek(0)
                f.write(os.urandom(file_size))
        os.remove(file_path)
    except Exception as e:
        logger.error(f"安全删除失败: {file_path}, 错误: {e}")
        raise


def execute_cleanup(files: List[Dict], config: Dict, dry_run: bool = False) -> Dict:
    """执行实际清理操作"""
    stats = {
        "total_freed": 0,
        "success": [],
        "failed": [],
        "dry_run": dry_run
    }

    for file_info in files:
        path = file_info["path"]
        try:
            if dry_run:
                stats["success"].append(path)
                continue

            if config["security"]["secure_delete"]:
                secure_delete(path, config["security"]["overwrite_passes"])
            else:
                if file_info["is_dir"]:
                    shutil.rmtree(path)
                else:
                    os.remove(path)

            stats["success"].append(path)
            stats["total_freed"] += file_info["size"]
        except Exception as e:
            stats["failed"].append({"path": path, "error": str(e)})
            logger.error(f"清理失败: {path}, 错误: {e}")

    stats["total_freed_mb"] = stats["total_freed"] / (1024 * 1024)
    return stats


# ======================
# MCP工具方法（核心接口）
# ======================
@mcp.tool()
async def get_system_status() -> Dict:
    """获取系统状态信息"""
    config = load_config()
    os_type = get_os_type()

    return {
        "os": os_type,
        "config": config,
        "disks": {d.mountpoint: psutil.disk_usage(d.mountpoint)._asdict()
                  for d in psutil.disk_partitions() if os.path.exists(d.mountpoint)},
        "memory": psutil.virtual_memory()._asdict(),
        "cpu": psutil.cpu_percent(interval=1),
        "warning": "需要管理员权限清理系统目录" if os_type != "windows" else "请以管理员身份运行"
    }


@mcp.tool()
async def scan_system() -> Dict:
    """扫描系统垃圾文件"""
    config = load_config()
    os_type = get_os_type()
    results = {
        "temp_files": [],
        "cache_files": [],
        "log_files": [],
        "large_files": []
    }

    def process_path(entry):
        path = expand_path(entry["path"], os_type)
        if not os.path.exists(path):
            return

        for root, _, files in os.walk(path):
            for file in files:
                file_path = os.path.join(root, file)
                file_info = analyze_file(file_path, config)
                if file_info:
                    if file_info["size"] > config["file_rules"]["min_size_mb"] * 1024 * 1024:
                        results["large_files"].append(file_info)
                    elif file_info["extension"] == ".log":
                        results["log_files"].append(file_info)
                    elif file_info["extension"] == ".cache":
                        results["cache_files"].append(file_info)
                    elif file_info["extension"] == ".tmp":
                        results["temp_files"].append(file_info)

    with ThreadPoolExecutor(max_workers=config["file_rules"]["max_threads"]) as executor:
        paths = [entry for entry in config["scan_paths"].get(os_type, [])
                 if entry.get("enabled", True)]
        list(executor.map(process_path, paths))

    stats = {
        "total_files": sum(len(v) for v in results.values()),
        "total_size_mb": sum(f["size"] for category in results.values()
                             for f in category) / (1024 * 1024),
        "categories": {
            k: {"count": len(v), "size_mb": sum(f["size"] for f in v) / (1024 * 1024)}
            for k, v in results.items()
        }
    }

    return {"results": results, "stats": stats}


@mcp.tool()
async def clean_files(
        category: Optional[str] = None,
        file_list: Optional[List[str]] = None,
        dry_run: bool = False
) -> Dict:
    """
    执行清理操作
    参数:
        category: 要清理的类别(temp_files/cache_files等)
        file_list: 直接指定要清理的文件列表
        dry_run: 试运行模式(不实际删除)
    """
    config = load_config()
    if file_list:
        files_to_clean = [{"path": f, "size": 0, "is_dir": False} for f in file_list]
    elif category:
        scan_results = (await scan_system())["results"]
        files_to_clean = scan_results.get(category, [])
    else:
        return {"error": "必须指定category或file_list"}

    return execute_cleanup(files_to_clean, config, dry_run)


@mcp.tool()
async def empty_recycle_bin() -> Dict:
    """清空系统回收站"""
    os_type = get_os_type()
    try:
        if os_type == "windows":
            import winshell
            # 使用winshell库清空回收站，已经很完善
            winshell.recycle_bin().empty(confirm=False, show_progress=False, sound=False)
        elif os_type == "macos":
            # 清空用户主目录的废纸篓
            os.system("rm -rf ~/.Trash/*")
            # 使用macOS内置的命令
            os.system("osascript -e 'tell application \"Finder\" to empty trash'")
        elif os_type == "linux":
            # 清空更多可能的Linux回收站位置
            os.system("rm -rf ~/.local/share/Trash/*")  # 大多数Linux发行版
            os.system("rm -rf ~/.Trash/*")              # 某些Linux配置
            # 清空所有用户的回收站 (需要root权限)
            # os.system("sudo rm -rf /root/.local/share/Trash/*")  # root用户回收站
        return {"status": "success", "message": "回收站已清空"}
    except Exception as e:
        logger.error(f"清空回收站失败: {e}")
        return {"status": "error", "message": str(e)}


@mcp.tool()
async def find_large_files(min_size_mb: int = 500, max_files: int = 100, timeout_seconds: int = 60) -> Dict:
    """查找大文件

    Args:
        min_size_mb: 最小文件大小(MB)
        max_files: 最多返回的文件数量
        timeout_seconds: 最大执行时间(秒)
    """
    import time
    import heapq
    from concurrent.futures import ThreadPoolExecutor, as_completed

    config = load_config()
    os_type = get_os_type()
    start_time = time.time()

    # 使用堆来保存最大的文件，这样可以限制内存使用
    largest_files = []
    scanned_count = 0

    # 排除的目录，避免扫描不必要的目录
    excluded_dirs = [
        ".git", "node_modules", "venv", "env", "__pycache__",
        ".vscode", ".idea", "Library", "Applications"
    ]

    # 优先扫描的路径
    paths_to_scan = []
    if os_type == "windows":
        paths_to_scan = [
            os.path.expanduser("~/Downloads"),
            os.path.expanduser("~/Documents"),
            os.path.expanduser("~/Desktop"),
            os.path.expanduser("~/Videos"),
            os.getenv("TEMP", "")
        ]
    else:  # macOS or Linux
        paths_to_scan = [
            os.path.expanduser("~/Downloads"),
            os.path.expanduser("~/Documents"),
            os.path.expanduser("~/Desktop"),
            os.path.expanduser("~/Videos"),
            "/tmp"
        ]

    # 如果上面的目录扫描完还有时间，再扫描整个用户主目录
    paths_to_scan.append(os.path.expanduser("~"))

    def should_skip_dir(dirpath):
        """判断是否应该跳过该目录"""
        basename = os.path.basename(dirpath)
        if basename.startswith('.'):  # 跳过隐藏目录
            return True
        if basename in excluded_dirs:
            return True
        return False

    def scan_directory(path, depth=0, max_depth=5):
        """扫描单个目录，带有深度限制"""
        nonlocal scanned_count

        if time.time() - start_time > timeout_seconds:
            return  # 超时退出

        try:
            for entry in os.scandir(path):
                if time.time() - start_time > timeout_seconds:
                    return  # 检查超时

                scanned_count += 1
                if scanned_count % 1000 == 0:  # 定期报告进度
                    logger.debug(f"已扫描 {scanned_count} 个文件/目录")

                if entry.is_file():
                    try:
                        file_size = entry.stat().st_size
                        if file_size > min_size_mb * 1024 * 1024:
                            file_info = {
                                "path": entry.path,
                                "size": file_size,
                                "size_mb": round(file_size / (1024 * 1024), 2),
                                "modified": entry.stat().st_mtime
                            }

                            if len(largest_files) < max_files:
                                heapq.heappush(largest_files, (file_size, file_info))
                            else:
                                # 替换堆中最小的文件
                                heapq.heappushpop(largest_files, (file_size, file_info))
                    except (PermissionError, OSError):
                        pass

                elif entry.is_dir() and not os.path.islink(entry.path):
                    if depth < max_depth and not should_skip_dir(entry.path):
                        scan_directory(entry.path, depth + 1, max_depth)

        except PermissionError:
            pass
        except Exception as e:
            logger.warning(f"扫描目录失败: {path}, 错误: {e}")

    # 使用线程池并发扫描多个目录
    with ThreadPoolExecutor(max_workers=4) as executor:
        # 创建扫描任务
        futures = []
        for path in paths_to_scan:
            if os.path.exists(path):
                futures.append(executor.submit(scan_directory, path))

        # 等待任务完成
        for future in as_completed(futures):
            try:
                future.result()
            except Exception as e:
                logger.error(f"扫描任务出错: {e}")

    # 将堆转换为按大小排序的列表
    result_files = [item[1] for item in sorted(largest_files, key=lambda x: x[0], reverse=True)]

    elapsed_time = time.time() - start_time
    return {
        "large_files": result_files,
        "total_size_mb": round(sum(f["size"] for f in result_files) / (1024 * 1024), 2),
        "scanned_count": scanned_count,
        "elapsed_seconds": round(elapsed_time, 2),
        "timed_out": elapsed_time >= timeout_seconds
    }


@mcp.tool()
async def update_config(new_config: Dict) -> Dict:
    """更新配置文件"""
    save_config(new_config)
    return {"status": "success", "config": load_config()}


if __name__ == "__main__":
    # 启动服务器
    mcp.run(transport='stdio')
