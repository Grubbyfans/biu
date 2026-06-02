import { useCallback, useEffect, useMemo, useState } from "react";

import { addToast, Spinner } from "@heroui/react";
import {
  RiExternalLinkLine,
  RiFileMusicLine,
  RiFileVideoLine,
  RiPlayCircleLine,
  RiPlayFill,
  RiPlayListAddLine,
  RiStarLine,
} from "@remixicon/react";

import { formatNumber } from "@/common/utils/number";
import { formatDuration } from "@/common/utils/time";
import { formatUrlProtocol } from "@/common/utils/url";
import ContextMenu, { type ContextMenuItem } from "@/components/context-menu";
import Image from "@/components/image";
import { getWebInterfaceArchiveRelated, type RelatedArchiveItem } from "@/service/web-interface-archive-related";
import { useModalStore } from "@/store/modal";
import { usePlayList, type PlayData, type PlayItem } from "@/store/play-list";
import { useUser } from "@/store/user";

interface RelatedRecommendProps {
  playItem: PlayData;
}

const MAX_RECOMMEND_COUNT = 8;

const toPlayItem = (item: RelatedArchiveItem): PlayItem => ({
  type: "mv",
  bvid: item.bvid,
  title: item.title,
  cover: formatUrlProtocol(item.pic),
  ownerName: item.owner?.name,
  ownerMid: item.owner?.mid,
});

const getContextMenus = ({ isLogin }: { isLogin?: boolean }): ContextMenuItem[] => [
  {
    icon: <RiPlayFill size={18} />,
    key: "play",
    label: "播放",
  },
  {
    icon: <RiPlayCircleLine size={18} />,
    key: "play-next",
    label: "下一首播放",
  },
  {
    icon: <RiPlayListAddLine size={18} />,
    key: "add-to-playlist",
    label: "添加到播放列表",
  },
  {
    icon: <RiStarLine size={18} />,
    key: "favorite",
    label: "收藏",
    hidden: !isLogin,
  },
  {
    icon: <RiFileMusicLine size={18} />,
    key: "download-audio",
    label: "下载音频",
  },
  {
    icon: <RiFileVideoLine size={18} />,
    key: "download-video",
    label: "下载视频",
  },
  {
    icon: <RiExternalLinkLine size={18} />,
    key: "bililink",
    label: "在 B 站打开",
  },
];

const RelatedRecommend = ({ playItem }: RelatedRecommendProps) => {
  const user = useUser(s => s.user);
  const [list, setList] = useState<RelatedArchiveItem[]>([]);
  const [loading, setLoading] = useState(false);

  const menus = useMemo(() => getContextMenus({ isLogin: Boolean(user?.isLogin) }), [user?.isLogin]);

  useEffect(() => {
    let canceled = false;

    const init = async () => {
      if (!playItem.bvid && !playItem.aid) {
        setList([]);
        return;
      }

      try {
        setLoading(true);
        const res = await getWebInterfaceArchiveRelated({
          bvid: playItem.bvid,
          aid: playItem.aid,
        });

        if (canceled) return;

        const related = (res.data ?? [])
          .filter(item => item.bvid && item.bvid !== playItem.bvid)
          .slice(0, MAX_RECOMMEND_COUNT);
        setList(related);
      } catch {
        if (!canceled) {
          setList([]);
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      canceled = true;
    };
  }, [playItem.aid, playItem.bvid]);

  const handleAction = useCallback(async (key: string, item: RelatedArchiveItem) => {
    const nextItem = toPlayItem(item);

    switch (key) {
      case "play":
        await usePlayList.getState().play(nextItem);
        break;
      case "play-next":
        usePlayList.getState().addToNext(nextItem);
        addToast({ title: "已添加到下一首播放", color: "success" });
        break;
      case "add-to-playlist":
        usePlayList.getState().addList([nextItem]);
        addToast({ title: "已添加到播放列表", color: "success" });
        break;
      case "favorite":
        useModalStore.getState().onOpenFavSelectModal({
          rid: item.aid,
          type: 2,
          title: item.title,
        });
        break;
      case "download-audio":
        await window.electron.addMediaDownloadTask({
          outputFileType: "audio",
          title: item.title,
          cover: formatUrlProtocol(item.pic),
          bvid: item.bvid,
        });
        addToast({ title: "已添加下载任务", color: "success" });
        break;
      case "download-video":
        await window.electron.addMediaDownloadTask({
          outputFileType: "video",
          title: item.title,
          cover: formatUrlProtocol(item.pic),
          bvid: item.bvid,
        });
        addToast({ title: "已添加下载任务", color: "success" });
        break;
      case "bililink":
        window.electron.openExternal(`https://www.bilibili.com/video/${item.bvid}`);
        break;
      default:
        break;
    }
  }, []);

  if (loading && !list.length) {
    return (
      <div className="mx-auto flex h-24 w-full max-w-6xl items-center justify-center px-12">
        <Spinner size="sm" label="加载相关推荐" />
      </div>
    );
  }

  if (!list.length) return null;

  return (
    <div className="mx-auto w-full max-w-6xl px-12">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium select-none">相关推荐</h3>
      </div>
      <div className="grid grid-cols-4 gap-3 xl:grid-cols-4">
        {list.map(item => {
          const cover = formatUrlProtocol(item.pic);
          return (
            <ContextMenu key={item.bvid} items={menus} onAction={key => handleAction(key, item)}>
              <button
                type="button"
                className="group flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md bg-black/20 p-2 text-left text-white/90 backdrop-blur-md transition-colors hover:bg-black/30"
                onClick={() => usePlayList.getState().play(toPlayItem(item))}
              >
                <div className="relative h-16 w-28 flex-none overflow-hidden rounded-md">
                  <Image removeWrapper src={cover} width="100%" height="100%" className="object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                    <RiPlayFill size={24} />
                  </div>
                  {Boolean(item.duration) && (
                    <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[10px] text-white">
                      {formatDuration(item.duration!)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm leading-5">{item.title}</div>
                  <div className="mt-1 flex min-w-0 items-center justify-between gap-2 text-xs text-white/60">
                    <span className="truncate">{item.owner?.name || "未知"}</span>
                    {typeof item.stat?.view === "number" && (
                      <span className="shrink-0">{formatNumber(item.stat.view)}</span>
                    )}
                  </div>
                </div>
              </button>
            </ContextMenu>
          );
        })}
      </div>
    </div>
  );
};

export default RelatedRecommend;
