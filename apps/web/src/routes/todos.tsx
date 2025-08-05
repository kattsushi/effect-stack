import { Rx, useRx } from '@effect-rx/rx-react'
import { api } from '@monorepo/backend/convex/_generated/api'
import type { Id } from '@monorepo/backend/convex/_generated/dataModel'
import {
  DeleteTodosArgs,
  DeleteTodosResult,
  InsertTodosArgs,
  InsertTodosResult,
  ListTodosArgs,
  ListTodosResult,
  ToggleTodosArgs,
} from '@monorepo/backend/convex/functions.schemas'
import { useMutation, useQuery } from '@monorepo/confect/react'
import { Button } from '@monorepo/ui-web/components/primitives/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@monorepo/ui-web/components/primitives/card'
import { Checkbox } from '@monorepo/ui-web/components/primitives/checkbox'
import { Input } from '@monorepo/ui-web/components/primitives/input'
import { createFileRoute } from '@tanstack/react-router'
import * as Array from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import { Trash2 } from 'lucide-react'
import type React from 'react'
export const Route = createFileRoute('/todos')({
  component: TodosRoute,
})

const todoTextRx = Rx.make('')

function TodosRoute() {
  const [newTodoText, setNewTodoText] = useRx(todoTextRx)

  const todosQuery = useQuery({
    query: api.functions.listTodos,
    args: ListTodosArgs,
    returns: ListTodosResult,
  })({})

  const createTodo = useMutation({
    mutation: api.functions.insertTodo,
    args: InsertTodosArgs,
    returns: InsertTodosResult,
  })

  const toggleTodo = useMutation({
    mutation: api.functions.toggleTodo,
    args: ToggleTodosArgs,
    returns: Schema.Null,
  })

  const removeTodo = useMutation({
    mutation: api.functions.deleteTodo,
    args: DeleteTodosArgs,
    returns: DeleteTodosResult,
  })

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = newTodoText.trim()
    if (text) {
      setNewTodoText('')
      try {
        await createTodo({ text }).pipe(Effect.runPromise)
      } catch (error) {
        console.error('Failed to add todo:', error)
        setNewTodoText(text)
      }
    }
  }

  const handleToggleTodo = async (id: Id<'todos'>, completed: boolean) => {
    await toggleTodo({ todoId: id, completed: !completed }).pipe(Effect.runPromise)
  }

  const handleDeleteTodo = async (id: Id<'todos'>) => {
    try {
      await removeTodo({ todoId: id }).pipe(Effect.runPromise)
    } catch (error) {
      console.error('Failed to delete todo:', error)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle>Todo List (Convex)</CardTitle>
          <CardDescription>Manage your tasks efficiently</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="mb-6 flex items-center space-x-2" onSubmit={handleAddTodo}>
            <Input
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Add a new task..."
              value={newTodoText}
            />
            <Button disabled={!newTodoText.trim()} type="submit">
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
                          onCheckedChange={() => handleToggleTodo(todo._id, todo.completed ?? false)}
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
