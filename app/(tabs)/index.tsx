import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import { WebView } from 'react-native-webview';

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const webviewRef = useRef<WebView>(null);
  const colorScheme = useColorScheme();

  const handleSearch = () => {
    setLoading(true);
    setResults([]);
    setScraping(false);
  };

  const handleMessage = (event: any) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'initial-results') {
      setResults(data.payload);
      setLoading(false);
      setScraping(true);
      setCurrentResultIndex(0);
    } else if (data.type === 'slow-link') {
      const newResults = [...results];
      newResults[data.index].slowLink = data.payload;
      setResults(newResults);
      if (data.index < newResults.length - 1) {
        setCurrentResultIndex(data.index + 1);
      } else {
        setScraping(false);
      }
    }
  };

  const getInitialResultsJs = `
    const results = [];
    const aarecordList = document.getElementById('aarecord-list');
    if (aarecordList) {
      const items = aarecordList.querySelectorAll('a');
      for (let i = 0; i < Math.min(items.length, 10); i++) {
        const item = items[i];
        const title = item.querySelector('h3').innerText;
        const url = item.href;
        const imageDiv = aarecordList.querySelector('div[id^="list_cover_aarecord_id__md5:"]');
        let image = null;
        if (imageDiv) {
            const imgTag = imageDiv.querySelector('img');
            if (imgTag) {
                image = imgTag.src;
            }
        }
        results.push({ title: title, url: url, image: image });
      }
    }
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'initial-results', payload: results }));
  `;

  const getSlowLinkJs = (index: number) => `
    const slowLink = document.querySelector('a[href*="slow_download"]');
    if (slowLink) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'slow-link', payload: slowLink.href, index: ${index} }));
    } else {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'slow-link', payload: 'Not found', index: ${index} }));
    }
  `;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      paddingTop: Platform.OS === 'android' ? 40 : 16,
    },
    searchContainer: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    input: {
      flex: 1,
      borderColor: colorScheme === 'light' ? '#ccc' : '#555',
      borderWidth: 1,
      padding: 8,
      marginRight: 8,
      color: Colors[colorScheme ?? 'light'].text,
    },
    resultItem: {
      marginBottom: 16,
      flexDirection: 'row',
    },
    link: {
      color: Colors[colorScheme ?? 'light'].tint,
    },
    resultTextContainer: {
      flex: 1,
    },
    image: {
        width: 100,
        height: 100,
        marginRight: 10,
    }
  });

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Anna's Archive Search</ThemedText>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter search term"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors[colorScheme ?? 'light'].text}
        />
        <TouchableOpacity
          style={{
            backgroundColor: Colors[colorScheme ?? 'light'].tint,
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 4,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={handleSearch}
        >
          <Text style={{ color: Colors[colorScheme ?? 'light'].background, fontWeight: 'bold' }}>
            Search
          </Text>
        </TouchableOpacity>  
        {/* <Button title="Search" onPress={handleSearch} color={Colors[colorScheme ?? 'light'].tint} /> */}
      </View>
      {loading && <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />}
      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.resultItem}>
              {item.image && <Image source={{ uri: item.image }} style={styles.image} />}
              <View style={styles.resultTextContainer}>
                <Text selectable={true} style={{ color: Colors[colorScheme ?? 'light'].text }}>{item.title}</Text>
                {item.slowLink ? (
                  <TouchableOpacity onPress={() => Linking.openURL(item.slowLink)}>
                    <Text selectable={true} style={styles.link}>{item.slowLink}</Text>
                  </TouchableOpacity>
                ) : (
                  <ActivityIndicator color={Colors[colorScheme ?? 'light'].tint} />
                )}
              </View>
            </View>
          )}
        />
      )}
      {(loading || scraping) && (
        <WebView
          ref={webviewRef}
          source={{
            uri: scraping
              ? results[currentResultIndex].url
              : `https://annas-archive.org/search?q=${searchQuery.split(' ').join('+')}`,
          }}
          onMessage={handleMessage}
          injectedJavaScript={scraping ? getSlowLinkJs(currentResultIndex) : getInitialResultsJs}
          style={{ width: 0, height: 0, opacity: 0 }} // Hide the WebView
        />
      )}
    </ThemedView>
  );
}