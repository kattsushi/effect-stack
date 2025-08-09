import { Result } from '@effect-atom/atom'
import { useAtom, useAtomSet, useAtomValue } from '@effect-atom/atom-react'
import { Button } from '@monorepo/ui-web/components/primitives/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@monorepo/ui-web/components/primitives/card'
import { Checkbox } from '@monorepo/ui-web/components/primitives/checkbox'
import { Input } from '@monorepo/ui-web/components/primitives/input'
import { createFileRoute } from '@tanstack/react-router'
import * as Array from 'effect/Array'
import { constant } from 'effect/Function'
import { Trash2 } from 'lucide-react'

import { api } from '@monorepo/backend/convex/_generated/api'
import { ConfectProvider, useAtomValueConfect, useAtomSetConfect, useAtomSetConfectAction } from '@monorepo/confect/react/effect-atom'
import { atomRuntime } from '@/lib/runtime'
import {
  getFirstTodoAtom,
  todoTextAtom,
} from '@/atoms/todos'
export const Route = createFileRoute('/todos')({
  component: () => (
    <ConfectProvider atomRuntime={atomRuntime}>
      <TodosRoute />
    </ConfectProvider>
  ),
})

function TodosRoute() {
  // ✅ Clean component - only imports and uses atoms
  // ✅ No business logic, no atom creation
  // ✅ Better performance and memoization

  const [newTodoText, setNewTodoText] = useAtom(todoTextAtom)

  // 🎯 NEW API: Use Confect hooks - atoms memoizados que usan Effects existentes
  const todosResult = useAtomValueConfect(api, 'functions', 'listTodos', {})
  const addTodo = useAtomSetConfect(api, 'functions', 'insertTodo')
  const toggleTodo = useAtomSetConfectAction(api, 'functions', 'toggleTodo') // Action
  const deleteTodo = useAtomSetConfect(api, 'functions', 'deleteTodo')

  const firstTodoResult = useAtomValue(getFirstTodoAtom)
  const handleGetFirstTodo = useAtomSet(getFirstTodoAtom, { mode: 'promise' })

  return (
    <div className="mx-auto w-full max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle>Todo List (Convex)</CardTitle>
          <CardDescription>Manage your tasks efficiently</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center space-x-2">
            <Input
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Add a new task..."
              value={newTodoText}
            />
            <Button
              disabled={!newTodoText.trim()}
              onClick={() => {
                addTodo({ text: newTodoText })
                setNewTodoText('')
              }}
              type="submit"
            >
              Add
            </Button>
          </div>
          {Result.builder(todosResult)
            .onInitial((result) => Result.isInitial(result) && result.waiting && <p>Loading...</p>)
            .onSuccess((todosData: any) =>
              Array.isEmptyReadonlyArray(todosData) ? (
                <p>No todos yet. Add one above!</p>
              ) : (
                <ul className="space-y-2">
                  {Array.map(todosData, (todo: any) => (
                    <li className="flex items-center justify-between rounded-md border p-2" key={todo._id}>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={todo.completed}
                          id={`todo-${todo._id}`}
                          onCheckedChange={() => toggleTodo({ id: todo._id })}
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
                        onClick={() => deleteTodo({ id: todo._id })}
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
            .render()}

            <Button onClick={() => handleGetFirstTodo()}>Get First Todo</Button>
              <div>
                {Result.builder(firstTodoResult)
                  .onInitial(() => <p>Initial state (not waiting)</p>)
                  .onWaiting(() => <p>Loading...</p>)
                  .onSuccess((data) => <p>{data?.text ?? 'No todos found'}</p>)
                  .render()}
              </div>
        </CardContent>
      </Card>
    </div>
  )
}
