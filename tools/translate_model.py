vertices = [
    [70, 22],
    [58, 22],
    [52, 30],
    [76, 30],
    [91, 41],
    [37, 41],
    [52, 51],
    [76, 51],
    [91, 41],
    [37, 41],
    [52, 30],
    [76, 30],
]

anchor_point = vertices[0]
furthest_from_anchor = 0
opposite_point = [0, 0]

for vertex in vertices:
    distance = (
        ((vertex[0]-anchor_point[0])**2) +
        ((vertex[1]-anchor_point[1])**2) 
    ) ** 0.5

    if distance > furthest_from_anchor:
        furthest_from_anchor = distance
        opposite_point = vertex

difference = [
    (anchor_point[0] - opposite_point[0])/2,
    (anchor_point[1] - opposite_point[1])/2,
]
translation = [
    anchor_point[0] - difference[0],
    anchor_point[1] - difference[1]
]

print(f'translation: {translation}')
print('New coordinates:')

for vertex in vertices:
    new_pos = [
        vertex[0] - translation[0],
        vertex[1] - translation[1]
    ]
    print(f'    {new_pos}')
