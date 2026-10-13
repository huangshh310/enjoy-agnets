"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useRef } from "react";
import { uiT, useUiLocale } from "@/i18n/ui-locale";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

export type ConversationProps = ComponentProps<typeof StickToBottom>;

export const Conversation = ({ className, ...props }: ConversationProps) => (
  <StickToBottom
    className={cn("relative flex-1 overflow-y-hidden", className)}
    initial="smooth"
    resize="smooth"
    role="log"
    {...props}
  />
);

/**
 * use-stick-to-bottom 只观察内容高度；视口被下方 Composer / 待验收条挤矮时不会跟着贴底，
 * 最后一张卡会被裁在视口底边、看着像压在条上。放进 <Conversation> 里：原本贴底就继续贴底。
 */
export const ConversationViewportStick = () => {
  const { scrollRef, isAtBottom, scrollToBottom } = useStickToBottomContext();
  const atBottom = useRef(isAtBottom);
  atBottom.current = isAtBottom;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let last = el.clientHeight;
    const observer = new ResizeObserver(() => {
      const height = el.clientHeight;
      if (height < last && atBottom.current) void scrollToBottom("instant");
      last = height;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollRef, scrollToBottom]);
  return null;
};

export type ConversationContentProps = ComponentProps<
  typeof StickToBottom.Content
>;

export const ConversationContent = ({
  className,
  ...props
}: ConversationContentProps) => (
  <StickToBottom.Content
    className={cn("flex flex-col gap-8 p-4", className)}
    {...props}
  />
);

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export const ConversationEmptyState = ({
  className,
  title,
  description,
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => {
  useUiLocale();
  const resolvedTitle = title ?? uiT("暂无消息", "No messages yet");
  const resolvedDescription =
    description ?? uiT("发一条消息后，对话会出现在这里", "Start a conversation to see messages here");

  return (
    <div
      className={cn(
        "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          {icon && <div className="text-muted-foreground">{icon}</div>}
          <div className="space-y-1">
            <h3 className="font-medium text-sm">{resolvedTitle}</h3>
            {resolvedDescription && (
              <p className="text-muted-foreground text-sm">{resolvedDescription}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return (
    !isAtBottom && (
      <Button
        className={cn(
          "absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full",
          className
        )}
        onClick={handleScrollToBottom}
        size="icon"
        type="button"
        variant="outline"
        {...props}
      >
        <ArrowDownIcon className="size-4" />
      </Button>
    )
  );
};
