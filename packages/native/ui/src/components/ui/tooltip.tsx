import { TextClassContext } from '@monorepo/native-ui/components/ui/text'
import { cn } from '@monorepo/native-ui/lib/utils'
import * as TooltipPrimitive from '@rn-primitives/tooltip'
import type * as React from 'react'
import { Platform, StyleSheet } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

function TooltipContent({
  className,
  sideOffset = 4,
  portalHost,
  ...props
}: TooltipPrimitive.ContentProps & {
  ref?: React.RefObject<TooltipPrimitive.ContentRef>
  portalHost?: string
}) {
  return (
    <TooltipPrimitive.Portal hostName={portalHost}>
      <TooltipPrimitive.Overlay style={Platform.OS !== 'web' ? StyleSheet.absoluteFill : undefined}>
        <Animated.View
          entering={Platform.select({ web: undefined, default: FadeIn })}
          exiting={Platform.select({ web: undefined, default: FadeOut })}
        >
          <TextClassContext.Provider value="text-sm native:text-base text-popover-foreground">
            <TooltipPrimitive.Content
              className={cn(
                'web:fade-in-0 web:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 web:animate-in overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5 shadow-foreground/5 shadow-md',
                className,
              )}
              sideOffset={sideOffset}
              {...props}
            />
          </TextClassContext.Provider>
        </Animated.View>
      </TooltipPrimitive.Overlay>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipTrigger }
