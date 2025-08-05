import { Rx, useRx } from '@effect-rx/rx-react'
import { api } from '@monorepo/backend/convex/_generated/api'
import type { Id } from '@monorepo/backend/convex/_generated/dataModel'
import { useMutation, useQuery } from '@monorepo/confect/react'
import { useRxPromise, useRxSetPromiseUnwrapped } from '@monorepo/shared/rx-utils'
import { Button } from '@monorepo/ui-web/components/primitives/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@monorepo/ui-web/components/primitives/card'
import { Checkbox } from '@monorepo/ui-web/components/primitives/checkbox'
import { Input } from '@monorepo/ui-web/components/primitives/input'
import { createFileRoute } from '@tanstack/react-router'
import * as Array from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import { Trash2 } from 'lucide-react'
import type React from 'react'
import { rxRuntime } from '@/lib/runtime'

export const Route = createFileRoute('/todos')({
  component: TodosRoute,
})

const todoTextRx = Rx.make('')

function TodosRoute() {
  const [newTodoText, setNewTodoText] = useRx(todoTextRx)

  const todosQuery = useQuery(api, 'functions', 'listTodos')({})

  const createTodo = useMutation(api, 'functions', 'insertTodo')

  const toggleTodoMutation = useMutation(api, 'functions', 'toggleTodo')

  const removeTodo = useMutation(api, 'functions', 'deleteTodo')

  const handleAddTodoRx = rxRuntime.fn(
    Effect.fn(function* (e: React.FormEvent, get: Rx.FnContext) {
      yield* Effect.sync(() => e.preventDefault())
      const text = get(todoTextRx).trim()
      if (text) {
        get.set(todoTextRx, '')
        yield* createTodo({ text })
        yield* Effect.log('Todo added')
      }
    }),
  )

  const [addState, setAdd] = useRxPromise(handleAddTodoRx)

  const handleToggleTodoRx = rxRuntime.fn(
    Effect.fn(function* ({ id, completed }: { id: Id<'todos'>; completed: boolean }) {
      return yield* toggleTodoMutation({ todoId: id, completed: !completed })
    }),
  )

  const handleToggleTodo = useRxSetPromiseUnwrapped(handleToggleTodoRx)

  const handleDeleteTodoRx = rxRuntime.fn(
    Effect.fnUntraced(function* (id: Id<'todos'>) {
      return yield* removeTodo({ todoId: id })
    }),
  )
  const handleDeleteTodo = useRxSetPromiseUnwrapped(handleDeleteTodoRx)

  return (
    <div className="mx-auto w-full max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle>Todo List (Convex)</CardTitle>
          <CardDescription>Manage your tasks efficiently</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="mb-6 flex items-center space-x-2" onSubmit={setAdd}>
            <Input
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Add a new task..."
              value={newTodoText}
            />
            <Button disabled={!newTodoText.trim() || addState.waiting} type="submit">
              Add
            </Button>
          </form>
          {Option.match(todosQuery, {
            onNone: () => <p>Loading...</p>,
            onSome: (todos) =>
              Array.isEmptyReadonlyArray(todos) ? (
                <p>No todos yet. Add one above!</p>
              ) : (
                <ul className="space-y-2">
                  {Array.map(todos, (todo) => (
                    <li className="flex items-center justify-between rounded-md border p-2" key={todo._id}>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={todo.completed}
                          id={`todo-${todo._id}`}
                          onCheckedChange={() => handleToggleTodo({ id: todo._id, completed: todo.completed ?? false })}
                        />
                        <label
                          className={`${todo.completed ? 'text-muted-foreground line-through' : ''}`}
                          htmlFor={`todo-${todo._id}`}
                        >
                          {todo.text}
                        </label>
                      </div>
                      <Button
                        aria-label="Delete todo"
                        onClick={() => handleDeleteTodo(todo._id)}
                        size="icon"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ),
          })}
        </CardContent>
      </Card>
    </div>
  )
}
