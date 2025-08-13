import { api } from '@monorepo/backend/convex/_generated/api'
import type { Id } from '@monorepo/backend/convex/_generated/dataModel'
import { useAction, useMutation, useQueryOption } from '@monorepo/confect/react'
import { Button } from '@monorepo/ui-web/components/primitives/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@monorepo/ui-web/components/primitives/card'
import { Checkbox } from '@monorepo/ui-web/components/primitives/checkbox'
import { Input } from '@monorepo/ui-web/components/primitives/input'
import { createFileRoute } from '@tanstack/react-router'
import { Effect } from 'effect'
import * as Array from 'effect/Array'
import * as Option from 'effect/Option'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { runtime } from '@/lib/runtime'

function TodosRoute() {
  const [newTodoText, setNewTodoText] = useState('')

  const todosQuery = useQueryOption(api, 'functions', 'listTodos')({})
  const addTodoEffect = useMutation(api, 'functions', 'insertTodo')
  const handleAddTodo = (text: string) =>
    addTodoEffect({ text })
      .pipe(
        Effect.catchTags({
          NotFoundError: () => Effect.log('Failed to insert todo - not found'),
        }),
        Effect.catchAll((error) => Effect.log(`Failed to insert todo: ${JSON.stringify(error)}`)),
        Effect.orDie,
        runtime.runPromise,
      )
      .then(() => setNewTodoText(''))

  const toggleTodoEffect = useAction(api, 'functions', 'toggleTodo')
  const handleToggleTodo = (id: Id<'todos'>) =>
    toggleTodoEffect({ id }).pipe(
      Effect.catchTags({
        NotFoundError: () => Effect.log('Failed to toggle todo - not found'),
      }),
      Effect.catchAll((error) => Effect.log(`Failed to toggle todo: ${JSON.stringify(error)}`)),
      Effect.orDie,
      runtime.runPromise,
    )

  const deleteTodoEffect = useMutation(api, 'functions', 'deleteTodo')
  const handleDeleteTodo = (id: Id<'todos'>) =>
    deleteTodoEffect({ id }).pipe(
      Effect.catchTags({
        NotFoundError: () => Effect.log('Failed to delete todo - not found'),
      }),
      Effect.catchAll((error) => Effect.log(`Failed to delete todo: ${JSON.stringify(error)}`)),
      Effect.orDie,
      runtime.runPromise,
    )

  const handleDeleteTodoWithConfirm = (id: Id<'todos'>) => {
    if (typeof window !== 'undefined' && window.confirm('Are you sure you want to delete this todo?')) {
      handleDeleteTodo(id)
    }
  }

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Todo List</CardTitle>
          <CardDescription>Manage your tasks efficiently with Effect Only</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Input
              className="flex-1"
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Add a new task..."
              value={newTodoText}
            />
            <Button disabled={!newTodoText.trim()} onClick={() => handleAddTodo(newTodoText.trim())}>
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {Option.match(todosQuery, {
              onNone: () => <p className="py-8 text-center text-muted-foreground">No todos yet. Add one above!</p>,
              onSome: (todosData) => {
                if (todosData && typeof todosData === 'object' && '_tag' in todosData) {
                  return <p className="py-8 text-center text-destructive">Error: {todosData.message}</p>
                }
                if (Array.isEmptyReadonlyArray(todosData)) {
                  return <p className="py-8 text-center text-muted-foreground">No todos yet. Add one above!</p>
                }

                return todosData.map((todo) => (
                  <div className="flex items-center justify-between rounded-lg border bg-card p-3" key={todo._id}>
                    <div className="flex flex-1 items-center gap-3">
                      <Checkbox checked={todo.completed} onCheckedChange={() => handleToggleTodo(todo._id)} />
                      <span
                        className={`flex-1 ${
                          todo.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                        }`}
                      >
                        {todo.text}
                      </span>
                    </div>
                    <Button
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteTodoWithConfirm(todo._id)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              },
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/todos-effect-only')({
  ssr: false,
  component: TodosRoute,
})
