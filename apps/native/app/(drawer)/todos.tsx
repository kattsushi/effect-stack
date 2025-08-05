import { Rx, useRx } from '@effect-rx/rx-react'
import { Ionicons } from '@expo/vector-icons'
import { api } from '@monorepo/backend/convex/_generated/api'
import type { Id } from '@monorepo/backend/convex/_generated/dataModel'
import { useMutation, useQuery } from '@monorepo/confect/react'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Container } from '@/components/container'

const todoTextRx = Rx.make('')

export default function TodosScreen() {
  const [newTodoText, setNewTodoText] = useRx(todoTextRx)

  const todosQuery = useQuery(api, 'functions', 'listTodos')({})
  const createTodoMutation = useMutation(api, 'functions', 'insertTodo')
  const toggleTodoMutation = useMutation(api, 'functions', 'toggleTodo')
  const deleteTodoMutation = useMutation(api, 'functions', 'deleteTodo')

  const handleAddTodo = async () => {
    const text = newTodoText.trim()
    if (!text) {
      return
    }
    await createTodoMutation({ text }).pipe(Effect.runPromise)
    setNewTodoText('')
  }

  const handleToggleTodo = (id: Id<'todos'>, currentCompleted: boolean) => {
    toggleTodoMutation({ todoId: id, completed: !currentCompleted }).pipe(Effect.runPromise)
  }

  const handleDeleteTodo = (id: Id<'todos'>) => {
    Alert.alert('Delete Todo', 'Are you sure you want to delete this todo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteTodoMutation({ todoId: id }).pipe(Effect.runPromise),
      },
    ])
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
                  onSubmitEditing={handleAddTodo}
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
              {Option.match(todosQuery, {
                onNone: () => (
                  <View className="flex justify-center py-8">
                    <ActivityIndicator color="#3b82f6" size="large" />
                  </View>
                ),
                onSome: (todos) =>
                  todos.map((todo) => (
                    <View
                      className="flex-row items-center justify-between rounded-md border border-border bg-background p-3"
                      key={todo._id}
                    >
                      <View className="flex-1 flex-row items-center">
                        <TouchableOpacity
                          className="mr-3"
                          onPress={() => handleToggleTodo(todo._id, todo.completed ?? false)}
                        >
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
                      <TouchableOpacity className="ml-2 p-1" onPress={() => handleDeleteTodo(todo._id)}>
                        <Ionicons color="#ef4444" name="trash-outline" size={20} />
                      </TouchableOpacity>
                    </View>
                  )),
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </Container>
  )
}
