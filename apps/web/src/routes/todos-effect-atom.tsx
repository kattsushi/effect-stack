import { Result, useAtom, useAtomSet, useAtomValue } from '@effect-atom/atom-react'
import { api } from '@monorepo/backend/convex/_generated/api'
import type { Id } from '@monorepo/backend/convex/_generated/dataModel'
import {
  ConfectProvider,
  useAtomSetConfect,
  useAtomSetConfectAction,
  useAtomValueConfect,
} from '@monorepo/confect/react/effect-atom'
import { Button } from '@monorepo/ui-web/components/primitives/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@monorepo/ui-web/components/primitives/card'
import { Checkbox } from '@monorepo/ui-web/components/primitives/checkbox'
import { Input } from '@monorepo/ui-web/components/primitives/input'
import { createFileRoute } from '@tanstack/react-router'
import * as Array from 'effect/Array'
import { Trash2 } from 'lucide-react'
import { getFirstTodoAtom, todoTextAtom } from '@/atoms/todos'
import { atomRuntime } from '@/lib/runtime'

function TodosRoute() {
  const [newTodoText, setNewTodoText] = useAtom(todoTextAtom)

  // ✅ Clean component - only imports and uses atoms
  // ✅ No business logic, no atom creation
  // ✅ Better performance and memoization

  const todosResult = useAtomValueConfect(api, 'functions', 'listTodos', {})
  const addTodo = useAtomSetConfect(api, 'functions', 'insertTodo')
  const handleToggleTodo = useAtomSetConfectAction(api, 'functions', 'toggleTodo')
  const handleDeleteTodo = useAtomSetConfect(api, 'functions', 'deleteTodo')
  const firstTodoResult = useAtomValue(getFirstTodoAtom)
  const handleGetFirstTodo = useAtomSet(getFirstTodoAtom, { mode: 'promise' })

  const handleDeleteTodoWithConfirm = (id: Id<'todos'>) => {
    if (window.confirm('Are you sure you want to delete this todo?')) {
      handleDeleteTodo({ id })
    }
  }

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      addTodo({ text: newTodoText.trim() })
      setNewTodoText('') // Clear input after adding
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTodo()
    }
  }

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Todo List</CardTitle>
          <CardDescription>Manage your tasks efficiently with Effect atoms</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Todo Section */}
          <div className="flex gap-2">
            <Input
              className="flex-1"
              onChange={(e) => setNewTodoText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add a new task..."
              value={newTodoText}
            />
            <Button disabled={!newTodoText.trim()} onClick={handleAddTodo}>
              Add
            </Button>
          </div>

          {/* Todos List */}
          <div className="space-y-2">
            {Result.builder(todosResult)
              .onInitial(
                (result) =>
                  Result.isInitial(result) &&
                  result.waiting && (
                    <div className="flex justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
                    </div>
                  ),
              )
              .onSuccess((todosData) =>
                Array.isEmptyReadonlyArray(todosData) ? (
                  <p className="py-8 text-center text-muted-foreground">No todos yet. Add one above!</p>
                ) : (
                  todosData.map((todo) => (
                    <div className="flex items-center justify-between rounded-lg border bg-card p-3" key={todo._id}>
                      <div className="flex flex-1 items-center gap-3">
                        <Checkbox checked={todo.completed} onCheckedChange={() => handleToggleTodo({ id: todo._id })} />
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
                ),
              )
              .onDefect(() => <p className="py-4 text-center text-destructive">Error loading todos</p>)
              .onFailure(() => <p className="py-4 text-center text-destructive">Error loading todos</p>)
              .orNull()}
          </div>

          {/* Get First Todo Section */}
          <div className="border-t pt-4">
            <Button className="w-full" onClick={() => handleGetFirstTodo(undefined)} variant="secondary">
              Get First Todo
            </Button>

            <div className="mt-2">
              {Result.builder(firstTodoResult)
                .onInitial(() => <p className="text-muted-foreground text-sm">Initial state (not waiting)</p>)
                .onWaiting(() => <p className="text-muted-foreground text-sm">Loading...</p>)
                .onSuccess((data) => <p className="text-foreground text-sm">{data?.text ?? 'No todos found'}</p>)
                .render()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/todos-effect-atom')({
  component: () => (
    <ConfectProvider atomRuntime={atomRuntime}>
      <TodosRoute />
    </ConfectProvider>
  ),
})
