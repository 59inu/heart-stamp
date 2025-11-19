import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Platform, Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_WIDTH = 22;

interface ManuscriptPaperProps {
  content: string;
  minLines?: number;
  containerWidth?: number; // 컨테이너 너비를 받아서 CELLS_PER_ROW 계산
}

export const ManuscriptPaper: React.FC<ManuscriptPaperProps> = React.memo(
  ({ content, minLines = 10, containerWidth }) => {
    const CELLS_PER_ROW = Math.floor((containerWidth || SCREEN_WIDTH) / CELL_WIDTH);
    // 텍스트를 한 글자씩 분리하고 줄바꿈 처리
    const allCells = useMemo(() => {
      const chars = Array.from(content); // 이모지를 올바르게 분리
      const cells: Array<{ char: string; isEmpty: boolean; index: number }> = [];
      let cellIndex = 0;

      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];

        if (char === '\n') {
          // 줄바꿈: 현재 줄의 나머지 칸을 빈 칸으로 채움
          const currentColumn = cellIndex % CELLS_PER_ROW;
          const paddingNeeded = currentColumn === 0 ? 0 : CELLS_PER_ROW - currentColumn;

          for (let j = 0; j < paddingNeeded; j++) {
            cells.push({ char: ' ', isEmpty: true, index: cellIndex++ });
          }
        } else {
          // 일반 문자
          cells.push({ char, isEmpty: false, index: cellIndex++ });
        }
      }

      // 최소 줄 수 보장
      const minCells = CELLS_PER_ROW * minLines;
      const currentCells = cells.length;

      if (currentCells < minCells) {
        // 최소 줄보다 적으면 최소 줄까지 채움
        const emptyCellsNeeded = minCells - currentCells;
        for (let i = 0; i < emptyCellsNeeded; i++) {
          cells.push({ char: ' ', isEmpty: true, index: cellIndex++ });
        }
      } else {
        // 최소 줄 이상이면 마지막 줄만 채움
        const lastRowCells = currentCells % CELLS_PER_ROW;
        if (lastRowCells > 0) {
          const emptyCellsNeeded = CELLS_PER_ROW - lastRowCells;
          for (let i = 0; i < emptyCellsNeeded; i++) {
            cells.push({ char: ' ', isEmpty: true, index: cellIndex++ });
          }
        }
      }

      return cells;
    }, [content, minLines, CELLS_PER_ROW]);

    const renderItem = useCallback(
      ({ item }: { item: { char: string; isEmpty: boolean; index: number } }) => (
        <View style={styles.manuscriptCell}>
          <Text style={styles.manuscriptChar}>{item.char}</Text>
        </View>
      ),
      []
    );

    const keyExtractor = useCallback(
      (item: { char: string; isEmpty: boolean; index: number }) =>
        `${content.substring(0, 10)}-${item.isEmpty ? 'empty' : 'char'}-${item.index}`,
      [content]
    );

    return (
      <FlatList
        data={allCells}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={CELLS_PER_ROW}
        scrollEnabled={false}
        style={styles.flatListStyle}
        contentContainerStyle={styles.manuscriptContainer}
        initialNumToRender={50}
        maxToRenderPerBatch={50}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    );
  }
);

ManuscriptPaper.displayName = 'ManuscriptPaper';

const styles = StyleSheet.create({
  flatListStyle: {
    alignSelf: 'center',
  },
  manuscriptContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center', // 가운데 정렬 (원래 코드)
  },
  manuscriptCell: {
    width: CELL_WIDTH,
    height: CELL_WIDTH,
    borderWidth: 0.5,
    borderColor: '#e8e4d8',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fffef8',
  },
  manuscriptChar: {
    fontSize: 14,
    color: '#2c2c2c',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
