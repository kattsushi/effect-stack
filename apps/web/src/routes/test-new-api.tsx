import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryFromFunctions, useMutationFromFunctions } from '../lib/confect-helpers'
import { api } from '@monorepo/backend/convex/_generated/api'

export const Route = createFileRoute('/test-new-api')({
  component: TestNewApiRoute,
})

function TestNewApiRoute() {
  console.log('🔍 Testing NEW dynamic API with module specification...')

  // ✨ NEW DYNAMIC API - Specify module and function!
  const todosQuery = useQuery('functions', 'listTodos')({})
  const createTodo = useMutation('functions', 'insertTodo')

  // ✨ CONVENIENCE API - For common 'functions' module
  const todosQueryConvenience = useQueryFromFunctions('listTodos')({})
  const createTodoConvenience = useMutationFromFunctions('insertTodo')

  // Test different modules
  const randomAction = useMutation('functions', 'getRandom')

  console.log('🔍 todosQuery type check:', typeof todosQuery)
  console.log('🔍 createTodo type check:', typeof createTodo)
  console.log('🔍 todosQueryConvenience type check:', typeof todosQueryConvenience)
  console.log('🔍 createTodoConvenience type check:', typeof createTodoConvenience)
  console.log('🔍 randomAction type check:', typeof randomAction)
  console.log('✅ listTodos result:', todosQuery)

  // Test API availability
  console.log('🔍 API structure test:')
  console.log('- api.functions available:', typeof (api as any).functions)
  console.log('- api.functions.listTodos available:', typeof (api as any).functions?.listTodos)
  console.log('- api.functions.insertTodo available:', typeof (api as any).functions?.insertTodo)
  console.log('- api.functions.getRandom available:', typeof (api as any).functions?.getRandom)

  // Test type safety - this should give TypeScript errors if types are working
  // todosQuery should be Option<Todo[]>
  // createTodo should be (args: {text: string}) => Effect<Id<"todos">>

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Testing New API with Types</h1>
      <p>Check the console for test results and TypeScript should show proper types.</p>

      <div className="mt-4 space-y-2">
        <div>✅ todosQuery: Should be Option&lt;Todo[]&gt;</div>
        <div>✅ createTodo: Should be (args: {'{text: string}'}) =&gt; Effect&lt;Id&lt;"todos"&gt;&gt;</div>
        <div>🔍 Check TypeScript hover for type information</div>
      </div>

      <div className="mt-4">
        <h2 className="text-lg font-semibold">Todos Data:</h2>
        <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
          {JSON.stringify(todosQuery, null, 2)}
        </pre>
      </div>
    </div>
  )
}
