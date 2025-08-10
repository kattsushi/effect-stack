import { Result, useAtom, useAtomSet, useAtomValue } from '@effect-atom/atom-react'
import { Ionicons } from '@expo/vector-icons'
import { api } from '@monorepo/backend/convex/_generated/api'
import type { Id } from '@monorepo/backend/convex/_generated/dataModel'
import {
  ConfectProvider,
  useAtomSetConfect,
  useAtomSetConfectAction,
  useAtomValueConfect,
} from '@monorepo/confect/react/effect-atom'
import * as Array from 'effect/Array'
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { getFirstTodoAtom, todoTextAtom } from '@/atoms/todos'
import { Container } from '@/components/container'
import { atomRuntime } from '@/lib/runtime'

function TodosScreen() {
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

  const handleDeleteTodoWithAlert = (id: Id<'todos'>) => {
    Alert.alert('Delete Todo', 'Are you sure you want to delete this todo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDeleteTodo({ id }),
      },
    ])
  }

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      addTodo({ text: newTodoText.trim() })
      setNewTodoText('') // Clear input after adding
    }
  }

  return (
    <Container>
      <ScrollView className="flex-1">
        <View className="px-4 py-6">
          <View className="mb-6 rounded-lg border border-border bg-card p-4">
            <Text className="mb-2 font-bold text-2xl text-foreground">Todo List</Text>
            <Text className="mb-4 text-muted-foreground">Manage your tasks efficiently</Text>

            <View className="mb-6">
              <View className="mb-2 flex-row items-center space-x-2">
                <TextInput
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  onChangeText={setNewTodoText}
                  placeholder="Add a new task..."
                  placeholderTextColor="#6b7280"
                  returnKeyType="done"
                  value={newTodoText}
                />
                <TouchableOpacity
                  className={`rounded-md px-4 py-2 ${newTodoText.trim() ? 'bg-primary' : 'bg-muted'}`}
                  disabled={!newTodoText.trim()}
                  onPress={handleAddTodo}
                >
                  <Text className="font-medium text-white">Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="space-y-2">
              {Result.builder(todosResult)
                .onInitial(
                  (result) =>
                    Result.isInitial(result) &&
                    result.waiting && (
                      <View className="flex justify-center py-8">
                        <ActivityIndicator color="#3b82f6" size="large" />
                      </View>
                    ),
                )
                .onSuccess((todosData) =>
                  Array.isEmptyReadonlyArray(todosData) ? (
                    <Text className="text-muted-foreground">No todos yet. Add one above!</Text>
                  ) : (
                    todosData.map((todo) => (
                      <View
                        className="flex-row items-center justify-between rounded-md border border-border bg-background p-3"
                        key={todo._id}
                      >
                        <View className="flex-1 flex-row items-center">
                          <TouchableOpacity className="mr-3" onPress={() => handleToggleTodo({ id: todo._id })}>
                            <Ionicons
                              color={todo.completed ? '#22c55e' : '#6b7280'}
                              name={todo.completed ? 'checkbox' : 'square-outline'}
                              size={24}
                            />
                          </TouchableOpacity>
                          <Text
                            className={`flex-1 ${
                              todo.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                            }`}
                          >
                            {todo.text}
                          </Text>
                        </View>
                        <TouchableOpacity className="ml-2 p-1" onPress={() => handleDeleteTodoWithAlert(todo._id)}>
                          <Ionicons color="#ef4444" name="trash-outline" size={20} />
                        </TouchableOpacity>
                      </View>
                    ))
                  ),
                )
                .onDefect(() => <Text className="text-red-500">Error loading todos</Text>)
                .onFailure(() => <Text className="text-red-500">Error loading todos</Text>)
                .orNull()}
            </View>

            <TouchableOpacity
              className="mt-4 rounded-md bg-secondary px-4 py-2"
              onPress={() => handleGetFirstTodo(undefined)}
            >
              <Text className="text-center font-medium text-secondary-foreground">Get First Todo</Text>
            </TouchableOpacity>

            <View className="mt-4">
              {Result.builder(firstTodoResult)
                .onInitial(() => <Text className="text-muted-foreground">Initial state (not waiting)</Text>)
                .onWaiting(() => <Text className="text-muted-foreground">Loading...</Text>)
                .onSuccess((data) => <Text className="text-foreground">{data?.text ?? 'No todos found'}</Text>)
                .render()}
            </View>
          </View>
        </View>
      </ScrollView>
    </Container>
  )
}

// Export with ConfectProvider wrapper
export default function TodosScreenWithProvider() {
  return (
    <ConfectProvider atomRuntime={atomRuntime}>
      <TodosScreen />
    </ConfectProvider>
  )
}
