import { TextClassContext } from '@monorepo/ui-native/components/primitives/text'
import { Check } from '@monorepo/ui-native/lib/icons/check'
import { ChevronDown } from '@monorepo/ui-native/lib/icons/chevron-down'
import { ChevronRight } from '@monorepo/ui-native/lib/icons/chevron-right'
import { ChevronUp } from '@monorepo/ui-native/lib/icons/chevron-up'
import { cn } from '@monorepo/ui-native/lib/utils'
import * as ContextMenuPrimitive from '@rn-primitives/context-menu'
import type * as React from 'react'
import { Platform, type StyleProp, StyleSheet, Text, type TextProps, View, type ViewStyle } from 'react-native'

const ContextMenu = ContextMenuPrimitive.Root
const ContextMenuTrigger = ContextMenuPrimitive.Trigger
const ContextMenuGroup = ContextMenuPrimitive.Group
const ContextMenuSub = ContextMenuPrimitive.Sub
const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup

function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: ContextMenuPrimitive.SubTriggerProps & {
  ref?: React.RefObject<ContextMenuPrimitive.SubTriggerRef>
  children?: React.ReactNode
  inset?: boolean
}) {
  const { open } = ContextMenuPrimitive.useSubContext()

  const getIcon = () => {
    if (Platform.OS === 'web') {
      return ChevronRight
    }
    return open ? ChevronUp : ChevronDown
  }
  const Icon = getIcon()
  return (
    <TextClassContext.Provider
      value={cn('select-none native:text-lg text-primary text-sm', open && 'native:text-accent-foreground')}
    >
      <ContextMenuPrimitive.SubTrigger
        className={cn(
          'flex web:cursor-default web:select-none flex-row items-center gap-2 rounded-sm px-2 native:py-2 py-1.5 web:outline-none web:hover:bg-accent web:focus:bg-accent active:bg-accent',
          open && 'bg-accent',
          inset && 'pl-8',
          className,
        )}
        {...props}
      >
        {children}
        <Icon className="ml-auto text-foreground" size={18} />
      </ContextMenuPrimitive.SubTrigger>
    </TextClassContext.Provider>
  )
}

function ContextMenuSubContent({
  className,
  ...props
}: ContextMenuPrimitive.SubContentProps & {
  ref?: React.RefObject<ContextMenuPrimitive.SubContentRef>
}) {
  const { open } = ContextMenuPrimitive.useSubContext()
  return (
    <ContextMenuPrimitive.SubContent
      className={cn(
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 shadow-foreground/5 shadow-md',
        open ? 'web:fade-in-0 web:zoom-in-95 web:animate-in' : 'web:fade-out-0 web:zoom-out web:animate-out',
        className,
      )}
      {...props}
    />
  )
}

function ContextMenuContent({
  className,
  overlayClassName,
  overlayStyle,
  portalHost,
  ...props
}: ContextMenuPrimitive.ContentProps & {
  ref?: React.RefObject<ContextMenuPrimitive.ContentRef>
  overlayStyle?: StyleProp<ViewStyle>
  overlayClassName?: string
  portalHost?: string
}) {
  const { open } = ContextMenuPrimitive.useRootContext()
  return (
    <ContextMenuPrimitive.Portal hostName={portalHost}>
      <ContextMenuPrimitive.Overlay
        className={overlayClassName}
        style={(() => {
          if (overlayStyle) {
            return StyleSheet.flatten([
              Platform.OS !== 'web' ? StyleSheet.absoluteFill : undefined,
              overlayStyle as typeof StyleSheet.absoluteFill,
            ])
          }
          return Platform.OS !== 'web' ? StyleSheet.absoluteFill : undefined
        })()}
      >
        <ContextMenuPrimitive.Content
          className={cn(
            'web:data-[side=bottom]:slide-in-from-top-2 web:data-[side=left]:slide-in-from-right-2 web:data-[side=right]:slide-in-from-left-2 web:data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 shadow-foreground/5 shadow-md',
            open ? 'web:fade-in-0 web:zoom-in-95 web:animate-in' : 'web:fade-out-0 web:zoom-out-95 web:animate-out',
            className,
          )}
          {...props}
        />
      </ContextMenuPrimitive.Overlay>
    </ContextMenuPrimitive.Portal>
  )
}

function ContextMenuItem({
  className,
  inset,
  ...props
}: ContextMenuPrimitive.ItemProps & {
  ref?: React.RefObject<ContextMenuPrimitive.ItemRef>
  className?: string
  inset?: boolean
}) {
  return (
    <TextClassContext.Provider value="select-none text-sm native:text-lg text-popover-foreground web:group-focus:text-accent-foreground">
      <ContextMenuPrimitive.Item
        className={cn(
          'group relative flex web:cursor-default flex-row items-center gap-2 rounded-sm px-2 native:py-2 py-1.5 web:outline-none web:hover:bg-accent web:focus:bg-accent active:bg-accent',
          inset && 'pl-8',
          props.disabled && 'web:pointer-events-none opacity-50',
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  )
}

function ContextMenuCheckboxItem({
  className,
  children,
  ...props
}: ContextMenuPrimitive.CheckboxItemProps & {
  ref?: React.RefObject<ContextMenuPrimitive.CheckboxItemRef>
  children?: React.ReactNode
}) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      className={cn(
        'web:group relative flex web:cursor-default flex-row items-center rounded-sm native:py-2 py-1.5 pr-2 pl-8 web:outline-none web:focus:bg-accent active:bg-accent',
        props.disabled && 'web:pointer-events-none opacity-50',
        className,
      )}
      {...props}
    >
      <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <Check className="text-foreground" size={14} strokeWidth={3} />
        </ContextMenuPrimitive.ItemIndicator>
      </View>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  )
}

function ContextMenuRadioItem({
  className,
  children,
  ...props
}: ContextMenuPrimitive.RadioItemProps & {
  ref?: React.RefObject<ContextMenuPrimitive.RadioItemRef>
  children?: React.ReactNode
}) {
  return (
    <ContextMenuPrimitive.RadioItem
      className={cn(
        'web:group relative flex web:cursor-default flex-row items-center rounded-sm native:py-2 py-1.5 pr-2 pl-8 web:outline-none web:focus:bg-accent active:bg-accent',
        props.disabled && 'web:pointer-events-none opacity-50',
        className,
      )}
      {...props}
    >
      <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <View className="h-2 w-2 rounded-full bg-foreground" />
        </ContextMenuPrimitive.ItemIndicator>
      </View>
      {children}
    </ContextMenuPrimitive.RadioItem>
  )
}

function ContextMenuLabel({
  className,
  inset,
  ...props
}: ContextMenuPrimitive.LabelProps & {
  ref?: React.RefObject<ContextMenuPrimitive.LabelRef>
  className?: string
  inset?: boolean
}) {
  return (
    <ContextMenuPrimitive.Label
      className={cn(
        'web:cursor-default px-2 py-1.5 font-semibold native:text-base text-foreground text-sm',
        inset && 'pl-8',
        className,
      )}
      {...props}
    />
  )
}

function ContextMenuSeparator({
  className,
  ...props
}: ContextMenuPrimitive.SeparatorProps & {
  ref?: React.RefObject<ContextMenuPrimitive.SeparatorRef>
}) {
  return <ContextMenuPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
}

function ContextMenuShortcut({ className, ...props }: TextProps) {
  return (
    <Text
      className={cn('ml-auto native:text-sm text-muted-foreground text-xs tracking-widest', className)}
      {...props}
    />
  )
}

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
}
