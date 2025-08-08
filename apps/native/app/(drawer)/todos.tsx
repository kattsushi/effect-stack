import { Atom, Result, useAtom, useAtomValue } from '@effect-atom/atom-react'
import { Ionicons } from '@expo/vector-icons'
import { api } from '@monorepo/backend/convex/_generated/api'
import type { Id } from '@monorepo/backend/convex/_generated/dataModel'
import { useAction, useMutation, useQuery } from '@monorepo/confect/react'
import { useAtomPromise, useAtomSetPromiseUnwrapped } from '@monorepo/shared/atom-utils'
import * as Effect from 'effect/Effect'

import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Container } from '@/components/container'
import { atomRuntime } from '@/lib/runtime'

const todoTextAtom = Atom.make('')

export default function TodosScreen() {
  const [newTodoText, setNewTodoText] = useAtom(todoTextAtom)

  const todosQuery = useQuery(api, 'functions', 'listTodos')({})
  const todosQueryAtom = atomRuntime.atom(todosQuery)
  const todos = useAtomValue(todosQueryAtom)

  const createTodoMutation = useMutation(api, 'functions', 'insertTodo')
  const toggleTodoMutation = useAction(api, 'functions', 'toggleTodo')
  const deleteTodoMutation = useMutation(api, 'functions', 'deleteTodo')

  const handleAddTodoAtom = atomRuntime.fn(
    Effect.fn(function* (_: undefined, get: Atom.FnContext) {
      const text = get(todoTextAtom).trim()
      if (text) {
        get.set(todoTextAtom, '')
        yield* createTodoMutation({ text })
        yield* Effect.log('Todo added')
      }
    }),
  )

  const [addState, setAdd] = useAtomPromise(handleAddTodoAtom)

  const handleAddTodo = () => setAdd(undefined)
  const handleSubmitEditing = () => setAdd(undefined)

  const handleToggleTodoAtom = atomRuntime.fn(
    Effect.fn(function* (id: Id<'todos'>) {
      return yield* toggleTodoMutation({ id })
    }),
  )

  const handleToggleTodo = useAtomSetPromiseUnwrapped(handleToggleTodoAtom)

  const handleDeleteTodoAtom = atomRuntime.fn(
    Effect.fnUntraced(function* (id: Id<'todos'>) {
      return yield* deleteTodoMutation({ id })
    }),
  )

  const handleDeleteTodo = useAtomSetPromiseUnwrapped(handleDeleteTodoAtom)

  const handleDeleteTodoWithAlert = (id: Id<'todos'>) => {
    Alert.alert('Delete Todo', 'Are you sure you want to delete this todo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDeleteTodo(id),
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
                  onSubmitEditing={handleSubmitEditing}
                  placeholder="Add a new task..."
                  placeholderTextColor="#6b7280"
                  returnKeyType="done"
                  value={newTodoText}
                />
                <TouchableOpacity
                  className={`rounded-md px-4 py-2 ${newTodoText.trim() ? 'bg-primary' : 'bg-muted'}`}
                  disabled={!newTodoText.trim() || addState.waiting}
                  onPress={handleAddTodo}
                >
                  <Text className="font-medium text-white">Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="space-y-2">
              {Result.builder(todos)
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
                  )),
                )
                .orNull()}
            </View>
          </View>
        </View>
      </ScrollView>
    </Container>
  )
}
