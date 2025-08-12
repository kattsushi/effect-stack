import { Ionicons } from '@expo/vector-icons'
import { api } from '@monorepo/backend/convex/_generated/api'
import type { Id } from '@monorepo/backend/convex/_generated/dataModel'
import { useAction, useMutation, useQueryOption } from '@monorepo/confect/react'
import * as Array from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import { useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Container } from '@/components/container'
import { runtime } from '@/lib/runtime'

function TodosScreen() {
  const [newTodoText, setNewTodoText] = useState('')
  const todosOption = useQueryOption(api, 'functions', 'listTodos')({})
  const addTodoEffect = useMutation(api, 'functions', 'insertTodo')
  const toggleTodoEffect = useAction(api, 'functions', 'toggleTodo')
  const deleteTodoEffect = useMutation(api, 'functions', 'deleteTodo')

  const handleDeleteTodoWithAlert = (id: Id<'todos'>) => {
    Alert.alert('Delete Todo', 'Are you sure you want to delete this todo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTodoEffect({ id }).pipe(
            Effect.catchTags({
              NotFoundError: () => Effect.log('Failed to delete todo - not found'),
            }),
            Effect.catchAll((error) => Effect.log(`Failed to delete todo: ${JSON.stringify(error)}`)),
            Effect.orDie,
            runtime.runPromise,
          )
        },
      },
    ])
  }

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      addTodoEffect({ text: newTodoText.trim() })
        .pipe(
          Effect.catchTags({
            NotFoundError: () => Effect.log('Failed to insert todo - not found'),
          }),
          Effect.catchAll((error) => Effect.log(`Failed to insert todo: ${JSON.stringify(error)}`)),
          Effect.orDie,
          runtime.runPromise,
        )
        .then(() => setNewTodoText(''))
    }
  }

  const handleToggleTodo = (id: Id<'todos'>) => {
    toggleTodoEffect({ id }).pipe(
      Effect.catchTags({
        NotFoundError: () => Effect.log('Failed to toggle todo - not found'),
      }),
      Effect.catchAll((error) => Effect.log(`Failed to toggle todo: ${JSON.stringify(error)}`)),
      Effect.orDie,
      runtime.runPromise,
    )
  }

  if (todosOption.error) {
    return (
      <Container>
        <ScrollView className="flex-1">
          <View className="px-4 py-6">
            <Text className="text-red-500">Error loading todos</Text>
          </View>
        </ScrollView>
      </Container>
    )
  }
  if (todosOption.loading) {
    return (
      <Container>
        <ScrollView className="flex-1">
          <View className="px-4 py-6">
            <ActivityIndicator color="#3b82f6" size="large" />
          </View>
        </ScrollView>
      </Container>
    )
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
              {Option.match(todosOption.data, {
                onNone: () => (
                  <View className="flex justify-center py-8">
                    <ActivityIndicator color="#3b82f6" size="large" />
                  </View>
                ),
                onSome: (todosData) =>
                  Array.isEmptyReadonlyArray(todosData) ? (
                    <Text className="text-muted-foreground">No todos yet. Add one above!</Text>
                  ) : (
                    todosData.map((todo) => (
                      <View
                        className="flex-row items-center justify-between rounded-md border border-border bg-background p-3"
                        key={todo._id}
                      >
                        <View className="flex-1 flex-row items-center">
                          <TouchableOpacity className="mr-3" onPress={() => handleToggleTodo(todo._id)}>
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
              })}
            </View>

            {/* Effect-only version - no atom-based features */}
          </View>
        </View>
      </ScrollView>
    </Container>
  )
}

// Export direct component (no provider needed)
export default TodosScreen
