import { TextClassContext } from '@monorepo/ui-native/components/primitives/text'
import { cn } from '@monorepo/ui-native/lib/utils'
import * as HoverCardPrimitive from '@rn-primitives/hover-card'
import type * as React from 'react'
import { Platform, StyleSheet } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

const HoverCard = HoverCardPrimitive.Root

const HoverCardTrigger = HoverCardPrimitive.Trigger

function HoverCardContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: HoverCardPrimitive.ContentProps & {
  ref?: React.RefObject<HoverCardPrimitive.ContentRef>
}) {
  const { open } = HoverCardPrimitive.useRootContext()
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Overlay style={Platform.OS !== 'web' ? StyleSheet.absoluteFill : undefined}>
        <Animated.View entering={FadeIn}>
          <TextClassContext.Provider value="text-popover-foreground">
            <HoverCardPrimitive.Content
              align={align}
              className={cn(
                'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-64 web:cursor-auto rounded-md border border-border bg-popover p-4 shadow-foreground/5 shadow-md web:outline-none',
                open ? 'web:fade-in-0 web:zoom-in-95 web:animate-in' : 'web:fade-out-0 web:zoom-out-95 web:animate-out',
                className,
              )}
              sideOffset={sideOffset}
              {...props}
            />
          </TextClassContext.Provider>
        </Animated.View>
      </HoverCardPrimitive.Overlay>
    </HoverCardPrimitive.Portal>
  )
}

export { HoverCard, HoverCardContent, HoverCardTrigger }
