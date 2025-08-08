import { Result } from '@effect-rx/rx'
import { Rx, useRx, useRxValue } from '@effect-rx/rx-react'
import { api } from '@monorepo/backend/convex/_generated/api'
import type { Id } from '@monorepo/backend/convex/_generated/dataModel'
import { useEffectAction, useEffectMutation, useEffectQuery } from '@monorepo/confect/react/effect'
import { useRxPromise, useRxSetPromiseUnwrapped } from '@monorepo/shared/rx-utils'
import { Button } from '@monorepo/ui-web/components/primitives/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@monorepo/ui-web/components/primitives/card'
import { Checkbox } from '@monorepo/ui-web/components/primitives/checkbox'
import { Input } from '@monorepo/ui-web/components/primitives/input'
import { createFileRoute } from '@tanstack/react-router'
import * as Array from 'effect/Array'
import * as Effect from 'effect/Effect'
import { constant } from 'effect/Function'
import { Trash2 } from 'lucide-react'
import type React from 'react'
import { rxRuntime } from '@/lib/runtime'

export const Route = createFileRoute('/todos')({
  component: TodosRoute,
})

const todoTextRx = Rx.make('')

function TodosRoute() {
  const [newTodoText, setNewTodoText] = useRx(todoTextRx)

  const todosQuery = useEffectQuery(api, 'functions', 'listTodos')({})

  const todosQueryRx = rxRuntime.rx(todosQuery)
  const todos = useRxValue(todosQueryRx)

  const createTodo = useEffectMutation(api, 'functions', 'insertTodo')

  const toggleAction = useEffectAction(api, 'functions', 'toggleTodo')

  const removeTodo = useEffectMutation(api, 'functions', 'deleteTodo')

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
    Effect.fn(function* (id: Id<'todos'>) {
      return yield* toggleAction({ id })
    }),
  )

  const handleToggleTodo = useRxSetPromiseUnwrapped(handleToggleTodoRx)

  const handleDeleteTodoRx = rxRuntime.fn(
    Effect.fnUntraced(function* (id: Id<'todos'>) {
      return yield* removeTodo({ id })
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
          {Result.builder(todos)
            .onInitial((result) => Result.isInitial(result) && result.waiting && <p>Loading...</p>)
            .onSuccess((todosData) =>
              Array.isEmptyReadonlyArray(todosData) ? (
                <p>No todos yet. Add one above!</p>
              ) : (
                <ul className="space-y-2">
                  {Array.map(todosData, (todo) => (
                    <li className="flex items-center justify-between rounded-md border p-2" key={todo._id}>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={todo.completed}
                          id={`todo-${todo._id}`}
                          onCheckedChange={() => handleToggleTodo(todo._id)}
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
            )
            .onDefect(() => <p>Error loading todos</p>)
            .onFailure(constant('Error loading todos'))
            .orNull()}
        </CardContent>
      </Card>
    </div>
  )
}
