import { Result } from '@effect-atom/atom'
import { Atom, useAtom, useAtomValue } from '@effect-atom/atom-react'
import { api } from '@monorepo/backend/convex/_generated/api'
import type { Id } from '@monorepo/backend/convex/_generated/dataModel'
import { useAction, useMutation, useQuery } from '@monorepo/confect/react'
import { useAtomPromise, useAtomSetPromiseUnwrapped } from '@monorepo/shared/atom-utils'
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
import { atomRuntime } from '@/lib/runtime'

export const Route = createFileRoute('/todos')({
  component: TodosRoute,
})

const todoTextAtom = Atom.make('')

function TodosRoute() {
  const [newTodoText, setNewTodoText] = useAtom(todoTextAtom)

  const todosQuery = useQuery(api, 'functions', 'listTodos')({})

  const todosQueryAtom = atomRuntime.atom(todosQuery)
  const todos = useAtomValue(todosQueryAtom)

  const createTodo = useMutation(api, 'functions', 'insertTodo')

  const toggleAction = useAction(api, 'functions', 'toggleTodo')

  const removeTodo = useMutation(api, 'functions', 'deleteTodo')

  const handleAddTodoAtom = atomRuntime.fn(
    Effect.fn(function* (e: React.FormEvent, get: Atom.FnContext) {
      yield* Effect.sync(() => e.preventDefault())
      const text = get(todoTextAtom).trim()
      if (text) {
        get.set(todoTextAtom, '')
        yield* createTodo({ text })
        yield* Effect.log('Todo added')
      }
    }),
  )

  const [addState, setAdd] = useAtomPromise(handleAddTodoAtom)

  const handleToggleTodoAtom = atomRuntime.fn(
    Effect.fn(function* (id: Id<'todos'>) {
      return yield* toggleAction({ id })
    }),
  )

  const handleToggleTodo = useAtomSetPromiseUnwrapped(handleToggleTodoAtom)

  const handleDeleteTodoAtom = atomRuntime.fn(
    Effect.fnUntraced(function* (id: Id<'todos'>) {
      return yield* removeTodo({ id })
    }),
  )
  const handleDeleteTodo = useAtomSetPromiseUnwrapped(handleDeleteTodoAtom)

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
