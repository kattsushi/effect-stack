import { Result } from '@effect-atom/atom'
import { Atom, useAtom, useAtomSet, useAtomValue } from '@effect-atom/atom-react'
import { api } from '@monorepo/backend/convex/_generated/api'
import { useAction, useMutation, useQuery } from '@monorepo/confect/react'
import { Button } from '@monorepo/ui-web/components/primitives/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@monorepo/ui-web/components/primitives/card'
import { Checkbox } from '@monorepo/ui-web/components/primitives/checkbox'
import { Input } from '@monorepo/ui-web/components/primitives/input'
import { createFileRoute } from '@tanstack/react-router'
import * as Array from 'effect/Array'
import * as Effect from 'effect/Effect'
import { constant } from 'effect/Function'
import { Trash2 } from 'lucide-react'
import { ApiService } from '@/lib/api'
import { atomRuntime } from '@/lib/runtime'
export const Route = createFileRoute('/todos')({
  component: TodosRoute,
})
const todoTextAtom = Atom.make('')
// Create a simple atom that just executes the effect
const getFirstTodoAtom = atomRuntime.fn(
  Effect.fnUntraced(function* () {
    const client = yield* ApiService
    return yield* client.notes.getFirst()
  }),
)

function TodosRoute() {
  const [newTodoText, setNewTodoText] = useAtom(todoTextAtom)

  const todosQueryEffect = useQuery(api, 'functions', 'listTodos')({})
  const todosQueryAtom = atomRuntime.atom(todosQueryEffect)
  const todosResult = useAtomValue(todosQueryAtom)

  const toggleActionEffect = useAction(api, 'functions', 'toggleTodo')
  const handleToggleTodoAtom = atomRuntime.fn(toggleActionEffect)
  const handleToggleTodo = useAtomSet(handleToggleTodoAtom, { mode: 'promise' })

  const firstTodoResult = useAtomValue(getFirstTodoAtom)
  const handleGetFirstTodo = useAtomSet(getFirstTodoAtom, { mode: 'promise' })

  const createTodo = useMutation(api, 'functions', 'insertTodo')
  const handleAddTodoAtom = atomRuntime.fn(
    Effect.fn(function* (text: string, get: Atom.FnContext) {
      yield* createTodo({ text })
      get.set(todoTextAtom, '')
    }),
  )
  const [addNewTodoResult, setAddNewTodo] = useAtom(handleAddTodoAtom, { mode: 'promise' })

  const removeTodoEffect = useMutation(api, 'functions', 'deleteTodo')
  const handleDeleteTodoAtom = atomRuntime.fn(removeTodoEffect)
  const handleDeleteTodo = useAtomSet(handleDeleteTodoAtom, { mode: 'promise' })

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
              disabled={!newTodoText.trim() || addNewTodoResult.waiting}
              onClick={() => setAddNewTodo(newTodoText)}
              type="submit"
            >
              Add
            </Button>
          </div>
          {Result.builder(todosResult)
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
                          onCheckedChange={() => handleToggleTodo({ id: todo._id })}
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
                        onClick={() => handleDeleteTodo({ id: todo._id })}
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
