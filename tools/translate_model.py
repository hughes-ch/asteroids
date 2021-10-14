vertices1 = [[77,231],[73,216],[89,204],[101,212],[116,208],[129,224],[114,228],[125,246],[109,265],[90,255],[82,261],[70,245],]

vertices2 = [[217,116],[218,107],[211,110],[211,95],[217,87],[230,88],[235,94],[238,106],[234,112],[227,106],[228,116],]

vertices3 = [[91,312],[74,321],[65,349],[74,368],[94,375],[117,368],[116,352],[126,340],[117,321],[100,330],]

vertices4 = [[679,220],[695,233],[694,244],[712,247],[713,221],[730,234],[736,230],[735,204],[723,187],[716,199],[703,183],[687,195],]

vertices = vertices1

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
