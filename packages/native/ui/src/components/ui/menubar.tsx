import { TextClassContext } from '@monorepo/native-ui/components/ui/text'
import { Check } from '@monorepo/native-ui/lib/icons/check'
import { ChevronDown } from '@monorepo/native-ui/lib/icons/chevron-down'
import { ChevronRight } from '@monorepo/native-ui/lib/icons/chevron-right'
import { ChevronUp } from '@monorepo/native-ui/lib/icons/chevron-up'
import { cn } from '@monorepo/native-ui/lib/utils'
import * as MenubarPrimitive from '@rn-primitives/menubar'
import type * as React from 'react'
import { Platform, Text, type TextProps, View } from 'react-native'

const MenubarMenu = MenubarPrimitive.Menu

const MenubarGroup = MenubarPrimitive.Group

const MenubarPortal = MenubarPrimitive.Portal

const MenubarSub = MenubarPrimitive.Sub

const MenubarRadioGroup = MenubarPrimitive.RadioGroup

function Menubar({
  className,
  ...props
}: MenubarPrimitive.RootProps & {
  ref?: React.RefObject<MenubarPrimitive.RootRef>
}) {
  return (
    <MenubarPrimitive.Root
      className={cn(
        'flex h-10 native:h-12 flex-row items-center space-x-1 rounded-md border border-border bg-background p-1',
        className,
      )}
      {...props}
    />
  )
}

function MenubarTrigger({
  className,
  ...props
}: MenubarPrimitive.TriggerProps & {
  ref?: React.RefObject<MenubarPrimitive.TriggerRef>
}) {
  const { value } = MenubarPrimitive.useRootContext()
  const { value: itemValue } = MenubarPrimitive.useMenuContext()

  return (
    <MenubarPrimitive.Trigger
      className={cn(
        'flex native:h-10 web:cursor-default web:select-none flex-row items-center rounded-sm native:px-5 px-3 native:py-0 py-1.5 font-medium text-sm web:outline-none web:focus:bg-accent web:focus:text-accent-foreground active:bg-accent',
        value === itemValue && 'bg-accent text-accent-foreground',
        className,
      )}
      {...props}
    />
  )
}

function MenubarSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenubarPrimitive.SubTriggerProps & {
  ref?: React.RefObject<MenubarPrimitive.SubTriggerRef>
  className?: string
  inset?: boolean
  children?: React.ReactNode
}) {
  const { open } = MenubarPrimitive.useSubContext()
  const Icon = Platform.OS === 'web' ? ChevronRight : open ? ChevronUp : ChevronDown
  return (
    <TextClassContext.Provider
      value={cn('select-none native:text-lg text-primary text-sm', open && 'native:text-accent-foreground')}
    >
      <MenubarPrimitive.SubTrigger
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
      </MenubarPrimitive.SubTrigger>
    </TextClassContext.Provider>
  )
}

function MenubarSubContent({
  className,
  ...props
}: MenubarPrimitive.SubContentProps & {
  ref?: React.RefObject<MenubarPrimitive.SubContentRef>
}) {
  const { open } = MenubarPrimitive.useSubContext()
  return (
    <MenubarPrimitive.SubContent
      className={cn(
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 shadow-foreground/5 shadow-md',
        open ? 'web:fade-in-0 web:zoom-in-95 web:animate-in' : 'web:fade-out-0 web:zoom-out web:animate-out',
        className,
      )}
      {...props}
    />
  )
}

function MenubarContent({
  className,
  portalHost,
  ...props
}: MenubarPrimitive.ContentProps & {
  ref?: React.RefObject<MenubarPrimitive.ContentRef>
  className?: string
  portalHost?: string
}) {
  const { value } = MenubarPrimitive.useRootContext()
  const { value: itemValue } = MenubarPrimitive.useMenuContext()
  return (
    <MenubarPrimitive.Portal hostName={portalHost}>
      <MenubarPrimitive.Content
        className={cn(
          'z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 shadow-foreground/5 shadow-md',
          value === itemValue
            ? 'web:fade-in-0 web:zoom-in-95 web:animate-in'
            : 'web:fade-out-0 web:zoom-out-95 web:animate-out',
          className,
        )}
        {...props}
      />
    </MenubarPrimitive.Portal>
  )
}

function MenubarItem({
  className,
  inset,
  ...props
}: MenubarPrimitive.ItemProps & {
  ref?: React.RefObject<MenubarPrimitive.ItemRef>
  className?: string
  inset?: boolean
}) {
  return (
    <TextClassContext.Provider value="select-none text-sm native:text-lg text-popover-foreground web:group-focus:text-accent-foreground">
      <MenubarPrimitive.Item
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

function MenubarCheckboxItem({
  className,
  children,
  checked,
  ...props
}: MenubarPrimitive.CheckboxItemProps & {
  ref?: React.RefObject<MenubarPrimitive.CheckboxItemRef>
  children?: React.ReactNode
}) {
  return (
    <MenubarPrimitive.CheckboxItem
      checked={checked}
      className={cn(
        'web:group relative flex web:cursor-default flex-row items-center rounded-sm native:py-2 py-1.5 pr-2 pl-8 web:outline-none web:focus:bg-accent active:bg-accent',
        props.disabled && 'web:pointer-events-none opacity-50',
        className,
      )}
      {...props}
    >
      <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <Check className="text-foreground" size={14} strokeWidth={3} />
        </MenubarPrimitive.ItemIndicator>
      </View>
      {children}
    </MenubarPrimitive.CheckboxItem>
  )
}

function MenubarRadioItem({
  className,
  children,
  ...props
}: MenubarPrimitive.RadioItemProps & {
  ref?: React.RefObject<MenubarPrimitive.RadioItemRef>
  children?: React.ReactNode
}) {
  return (
    <MenubarPrimitive.RadioItem
      className={cn(
        'web:group relative flex web:cursor-default flex-row items-center rounded-sm native:py-2 py-1.5 pr-2 pl-8 web:outline-none web:focus:bg-accent active:bg-accent',
        props.disabled && 'web:pointer-events-none opacity-50',
        className,
      )}
      {...props}
    >
      <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <View className="h-2 w-2 rounded-full bg-foreground" />
        </MenubarPrimitive.ItemIndicator>
      </View>
      {children}
    </MenubarPrimitive.RadioItem>
  )
}

function MenubarLabel({
  className,
  inset,
  ...props
}: MenubarPrimitive.LabelProps & {
  ref?: React.RefObject<MenubarPrimitive.LabelRef>
  className?: string
  inset?: boolean
}) {
  return (
    <MenubarPrimitive.Label
      className={cn(
        'web:cursor-default px-2 py-1.5 font-semibold native:text-base text-foreground text-sm',
        inset && 'pl-8',
        className,
      )}
      {...props}
    />
  )
}

function MenubarSeparator({
  className,
  ...props
}: MenubarPrimitive.SeparatorProps & {
  ref?: React.RefObject<MenubarPrimitive.SeparatorRef>
}) {
  return <MenubarPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
}

function MenubarShortcut({ className, ...props }: TextProps) {
  return (
    <Text
      className={cn('ml-auto native:text-sm text-muted-foreground text-xs tracking-widest', className)}
      {...props}
    />
  )
}

export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
}
